import os
import argparse
from dotenv import load_dotenv

# Load env variables first
load_dotenv()

from teacher_analyzer import TeacherAnalyzer
from chart_generator import create_spider_chart

def main():
    parser = argparse.ArgumentParser(description="Run Teacher Analytics ML Model")
    parser.add_argument("--email", type=str, help="Email of the teacher to analyze")
    parser.add_argument("--all", action="store_true", help="Analyze all teachers")
    
    args = parser.parse_args()
    
    analyzer = TeacherAnalyzer()
    
    if args.email:
        print(f"Analyzing teacher: {args.email}...\n")
        result = analyzer.get_teacher_analysis(args.email)
        if result:
            print(f"Overall Score: {result['overall_score']}")
            print(f"Percentile Rank: {result['percentile_rank']}")
            print(f"Tier: {result['tier']}")
            print("\nDimensions:")
            for dim, score in result['dimensions'].items():
                print(f"  - {dim}: {score}")
            print("\nSuggestions:")
            for sug in result['suggestions']:
                print(f"  - {sug}")
                
            # Generate Chart
            output_dir = os.path.join(os.path.dirname(__file__), "output")
            chart_path = os.path.join(output_dir, f"{args.email.replace('@', '_at_')}_chart.png")
            create_spider_chart(result, chart_path)
            print(f"\nSpider chart generated at: {chart_path}")
        else:
            print(f"No data found for teacher: {args.email}")
            
    elif args.all:
        print("Analyzing all teachers...\n")
        results = analyzer.compute_teacher_metrics()
        for res in results:
             print(f"[{res['tier']}] {res['email']} - Score: {res['overall_score']} (Rank: {res['percentile_rank']})")
             
        print(f"\nTotal teachers analyzed: {len(results)}")
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
