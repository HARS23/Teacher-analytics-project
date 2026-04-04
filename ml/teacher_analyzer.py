import logging
import pandas as pd
import numpy as np
import requests
from textblob import TextBlob
from sklearn.preprocessing import MinMaxScaler
from sklearn.cluster import KMeans
from db import get_supabase_config

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TeacherAnalyzer:
    def __init__(self):
        self.config = get_supabase_config()
        self.url = self.config['url']
        self.headers = self.config['headers']
        logger.info("Initializing TeacherAnalyzer...")

    def _fetch_table(self, table_name, select="*"):
        """Helper to fetch a table using requests"""
        res = requests.get(f"{self.url}/rest/v1/{table_name}?select={select}", headers=self.headers)
        if res.status_code == 200:
            return res.json()
        logger.warning(f"Failed to fetch {table_name}: {res.status_code}")
        return []

    def fetch_all_data(self):
        """Fetches all necessary data from Supabase for all teachers."""
        # 1. Classrooms
        classrooms = self._fetch_table("classrooms")
        if not classrooms:
            return pd.DataFrame() # Return empty df if no classrooms
        cls_df = pd.DataFrame(classrooms)
        
        # 2. Feedbacks
        feedbacks = self._fetch_table("feedbacks")
        feedbacks_df = pd.DataFrame(feedbacks) if feedbacks else pd.DataFrame(columns=["classroom_id","student_id","answers","comment"])

        # 3. Quizzes
        quizzes = self._fetch_table("quizzes", select="id,classroom_id")
        quizzes_df = pd.DataFrame(quizzes) if quizzes else pd.DataFrame(columns=["id","classroom_id"])
        
        # 4. Quiz Attempts
        quiz_attempts = self._fetch_table("quiz_attempts", select="quiz_id,student_id,score,total_questions")
        attempts_df = pd.DataFrame(quiz_attempts) if quiz_attempts else pd.DataFrame(columns=["quiz_id","student_id","score","total_questions"])

        # 5. Enrollments
        enrollments = self._fetch_table("enrollments", select="classroom_id,student_id")
        enroll_df = pd.DataFrame(enrollments) if enrollments else pd.DataFrame(columns=["classroom_id","student_id"])

        return {
            "classrooms": cls_df,
            "feedbacks": feedbacks_df,
            "quizzes": quizzes_df,
            "quiz_attempts": attempts_df,
            "enrollments": enroll_df
        }

    def compute_teacher_metrics(self):
        """Computes raw metrics and normalizes them for all teachers."""
        # --- [1] Fetch Data ---
        data = self.fetch_all_data()
        df_cls = data.get("classrooms")
        if df_cls is None or df_cls.empty:
            logger.warning("No classroom data found.")
            return []

        df_fb = data.get("feedbacks")
        df_qz = data.get("quizzes")
        df_qa = data.get("quiz_attempts")
        df_enr = data.get("enrollments")

        teacher_emails = df_cls['teacher_id'].unique()
        teacher_metrics = []

        # --- [2] Compute Raw Metrics Iterating over Teachers ---
        for email in teacher_emails:
            t_cls = df_cls[df_cls['teacher_id'] == email]
            t_cls_ids = t_cls['id'].tolist()
            
            # --- Dimension 1: Student Satisfaction ---
            # Avg rating from all feedback answers
            t_fb = df_fb[df_fb['classroom_id'].isin(t_cls_ids)] if not df_fb.empty else pd.DataFrame()
            avg_rating = 0
            if not t_fb.empty:
                all_ratings = []
                for answers in t_fb['answers']:
                    if isinstance(answers, dict):
                         all_ratings.extend(list(answers.values()))
                if all_ratings:
                   avg_rating = np.mean(all_ratings)  # e.g., 4.2 out of 5
            
            # --- Dimension 2: Teaching Effectiveness ---
            # Avg quiz pass rate
            effectiveness_score = 0
            if not df_qz.empty and not df_qa.empty:
                t_quizzes = df_qz[df_qz['classroom_id'].isin(t_cls_ids)]
                t_qz_ids = t_quizzes['id'].tolist()
                t_attempts = df_qa[df_qa['quiz_id'].isin(t_qz_ids)]
                if not t_attempts.empty:
                     # Calculate percentage score for each attempt
                     t_attempts['pct'] = t_attempts.apply(lambda row: (row['score'] / row['total_questions']) if row['total_questions'] > 0 else 0, axis=1)
                     effectiveness_score = t_attempts['pct'].mean()
            
            # --- Dimension 3: Student Engagement ---
            # Feedback submission rate vs enrollments
            engagement_rate = 0
            t_enr = df_enr[df_enr['classroom_id'].isin(t_cls_ids)] if not df_enr.empty else pd.DataFrame()
            total_enrollments = len(t_enr)
            total_feedbacks = len(t_fb)
            if total_enrollments > 0:
                engagement_rate = min(total_feedbacks / total_enrollments, 1.0) # Cap at 1.0

            # --- Dimension 4: Content Coverage ---
            # Normalized based on number of quizzes relative to others later, but raw is quiz count
            quiz_count = 0
            if not df_qz.empty:
                quiz_count = len(df_qz[df_qz['classroom_id'].isin(t_cls_ids)])
            
            # --- Dimension 5: Comment Sentiment ---
            # NLP sentiment analysis on feedback comments
            sentiment_score = 0
            if not t_fb.empty and 'comment' in t_fb.columns:
                 sentiments = []
                 for comment in t_fb['comment']:
                     if isinstance(comment, str) and comment.strip():
                         blob = TextBlob(comment)
                         sentiments.append(blob.sentiment.polarity) # polarity is between -1 and 1
                 if sentiments:
                     # Shift polarity from [-1, 1] to [0, 1]
                     sentiment_score = (np.mean(sentiments) + 1) / 2

            # --- Dimension 6: Consistency ---
            # Low variance in average feedback rating across classrooms
            consistency_score = 1.0 # Default perfect consistency if 1 or 0 classrooms
            if not t_fb.empty and len(t_cls_ids) > 1:
                class_avgs = []
                for cid in t_cls_ids:
                    c_fb = t_fb[t_fb['classroom_id'] == cid]
                    if not c_fb.empty:
                        c_ratings = []
                        for answers in c_fb['answers']:
                           if isinstance(answers, dict):
                               c_ratings.extend(list(answers.values()))
                        if c_ratings:
                            class_avgs.append(np.mean(c_ratings))
                if len(class_avgs) > 1:
                    variance = np.var(class_avgs)
                    # We want *low* variance to be a *high* score
                    # Variance usually between 0 (identical) and ~4 (max diff in 1-5 scale)
                    # Use a decaying exponential or simple inversion for score
                    consistency_score = np.exp(-variance) 

            teacher_metrics.append({
                "email": email,
                "raw_satisfaction": avg_rating,
                "raw_effectiveness": effectiveness_score,
                "raw_engagement": engagement_rate,
                "raw_content": float(quiz_count),
                "raw_sentiment": sentiment_score,
                "raw_consistency": consistency_score
            })
            
        df_metrics = pd.DataFrame(teacher_metrics)
        if df_metrics.empty:
             return []

        # --- [3] ML Normalization (MinMaxScaler to 0-100) ---
        scaler = MinMaxScaler(feature_range=(0, 100))
        
        # Satisfaction is theoretically 1-5, so we can hardcode min/max or let the scaler do it relative to peers.
        # It's better to use fixed theoretical bounds where possible, or relative for competitive metrics.
        
        # Let's use relative scaling for everything to show comparative percentile-like scores
        features_to_scale = ["raw_satisfaction", "raw_effectiveness", "raw_engagement", "raw_content", "raw_sentiment", "raw_consistency"]
        
        # If there's only 1 teacher, scaler will 0 out everything. Handle this edge case by assigning scores out of 100 based on fixed theoretical maximums if possible.
        if len(df_metrics) == 1:
             df_metrics["Student Satisfaction"] = (df_metrics["raw_satisfaction"] / 5.0) * 100
             df_metrics["Teaching Effectiveness"] = df_metrics["raw_effectiveness"] * 100
             df_metrics["Student Engagement"] = df_metrics["raw_engagement"] * 100
             df_metrics["Content Coverage"] = min((df_metrics["raw_content"] / 5.0) * 100, 100) # Assume 5 quizzes is 100% for an individual
             df_metrics["Comment Sentiment"] = df_metrics["raw_sentiment"] * 100
             df_metrics["Consistency"] = df_metrics["raw_consistency"] * 100
        else:
             # Regular min-max scaling across peers
             # For satisfaction, we want to anchor min to 1 and max to 5 so absolute value matters
             scaled_data = scaler.fit_transform(df_metrics[features_to_scale])
             df_metrics["Student Satisfaction"] = (df_metrics["raw_satisfaction"] / 5.0) * 100 # Keep absolute for satisfaction
             df_metrics["Teaching Effectiveness"] = df_metrics["raw_effectiveness"] * 100 # pure %
             df_metrics["Student Engagement"] = df_metrics["raw_engagement"] * 100 # pure %
             
             # Relative scaling for content and consistency as absolute is harder to define
             # Reshape and fit separately
             content_scaler = MinMaxScaler(feature_range=(20, 100)) # Base 20 for having at least *some* content
             df_metrics["Content Coverage"] = content_scaler.fit_transform(df_metrics[["raw_content"]])
             
             df_metrics["Comment Sentiment"] = df_metrics["raw_sentiment"] * 100
             df_metrics["Consistency"] = df_metrics["raw_consistency"] * 100

        # Create composite 'Overall Score'
        df_metrics["overall_score"] = df_metrics[["Student Satisfaction", "Teaching Effectiveness", "Student Engagement", "Content Coverage", "Comment Sentiment", "Consistency"]].mean(axis=1)

        # --- [4] Clustering (K-Means) for Tiers ---
        # Calculate Rank
        df_metrics["percentile_rank"] = df_metrics["overall_score"].rank(pct=True) * 100
        
        df_metrics["tier"] = "Average"
        if len(df_metrics) >= 4:
            # Enough data for KMeans
            kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
            features_for_clustering = df_metrics[["Student Satisfaction", "Teaching Effectiveness", "overall_score"]]
            cluster_labels = kmeans.fit_predict(features_for_clustering)
            df_metrics["cluster"] = cluster_labels
            
            # Map clusters to meaningful names based on centroid's overall score
            centroids = kmeans.cluster_centers_
            centroid_scores = [(i, centroids[i][2]) for i in range(4)]
            centroid_scores.sort(key=lambda x: x[1], reverse=True) # Sort descending by overall score
            
            # Map: 1st -> Excellent, 2nd -> Good, 3rd -> Average, 4th -> Needs Improvement
            tier_map = {
                centroid_scores[0][0]: "Excellent",
                centroid_scores[1][0]: "Good",
                centroid_scores[2][0]: "Average",
                centroid_scores[3][0]: "Needs Improvement"
            }
            df_metrics["tier"] = df_metrics["cluster"].map(tier_map)
        else:
             # Fallback Rule-based tiering if not enough teachers
             # Note apply lambda syntax needs to return string
             def get_fallback_tier(score):
                 if score >= 80: return "Excellent"
                 elif score >= 60: return "Good"
                 elif score >= 40: return "Average"
                 else: return "Needs Improvement"
             df_metrics["tier"] = df_metrics["overall_score"].apply(get_fallback_tier)

        # Clean output
        results = []
        for _, row in df_metrics.iterrows():
             data = {
                 "email": row["email"],
                 "overall_score": round(row["overall_score"], 1),
                 "percentile_rank": round(row["percentile_rank"], 1),
                 "tier": row["tier"],
                 "dimensions": {
                     "Student Satisfaction": round(row["Student Satisfaction"], 1),
                     "Teaching Effectiveness": round(row["Teaching Effectiveness"], 1),
                     "Student Engagement": round(row["Student Engagement"], 1),
                     "Content Coverage": round(row["Content Coverage"], 1),
                     "Comment Sentiment": round(row["Comment Sentiment"], 1),
                     "Consistency": round(row["Consistency"], 1)
                 },
                 "suggestions": self.generate_suggestions({
                     "Student Satisfaction": row["Student Satisfaction"],
                     "Teaching Effectiveness": row["Teaching Effectiveness"],
                     "Student Engagement": row["Student Engagement"],
                     "Content Coverage": row["Content Coverage"],
                     "Comment Sentiment": row["Comment Sentiment"],
                     "Consistency": row["Consistency"]
                 })
             }
             results.append(data)

        # Sort by rank
        results.sort(key=lambda x: x["overall_score"], reverse=True)
        return results

    def generate_suggestions(self, dims):
         """Rule-based engine to generate improvement suggestions based on dimension scores."""
         suggestions = []
         if dims["Student Satisfaction"] < 60:
              suggestions.append("Student Satisfaction is low. Consider adding more interactive elements or asking for specific feedback on teaching style.")
         if dims["Teaching Effectiveness"] < 60:
              suggestions.append("Quiz scores are below average. Try reviewing core concepts before quizzes or providing more supplementary study materials.")
         if dims["Student Engagement"] < 50:
              suggestions.append("Student Engagement is lagging. Encourage feedback participation by explaining how it shapes the course.")
         if dims["Content Coverage"] < 50:
              suggestions.append("Content Coverage is low compared to peers. Consider creating more regular, short quizzes to assess understanding.")
         if dims["Comment Sentiment"] < 50:
              suggestions.append("Sentiment analysis on comments indicates some frustration. Look closely at the qualitative free-text feedback for recurring issues.")
         if dims["Consistency"] < 60:
              suggestions.append("High variance between classrooms. Try to standardise your approach across different groups to ensure a consistent experience.")
              
         if not suggestions:
              suggestions.append("Great job! All metrics look healthy. Consider mentoring peers.")
              
         return suggestions

    def get_teacher_analysis(self, email: str):
        """Gets full analysis for a single teacher."""
        all_metrics = self.compute_teacher_metrics()
        for metric in all_metrics:
            if metric["email"] == email:
                return metric
        return None
