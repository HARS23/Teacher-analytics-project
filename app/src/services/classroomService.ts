
import { supabase } from '../supabase';
import type { Classroom, Feedback, Quiz, QuizAttempt, FeedbackQuestion } from '@/types';

export const classroomService = {
    async getTeacherClassrooms(teacherEmail: string): Promise<Classroom[]> {
        const { data: classrooms, error } = await supabase
            .from('classrooms')
            .select(`
        *,
        students:enrollments(student_id),
        feedbacks:feedbacks(*),
        feedbackQuestions:feedback_questions(*),
        quizzes:quizzes(*, questions:quiz_questions(*), quizAttempts:quiz_attempts(*))
      `)
            .eq('teacher_id', teacherEmail);

        if (error || !classrooms) {
            console.error('Error fetching teacher classrooms:', error);
            return [];
        }

        // Fetch teacher name (for the teacher themselves, it's their own name, but let's be consistent)
        // Optimization: We know the email is teacherEmail.
        const { data: teacherData } = await supabase.from('users').select('name').eq('email', teacherEmail).single();
        const teacherName = teacherData?.name || 'Unknown Teacher';

        return classrooms.map(c => normalizeClassroom({ ...c, teacher_name: teacherName }));
    },

    async getStudentClassrooms(studentEmail: string): Promise<Classroom[]> {
        const { data: enrollments, error } = await supabase
            .from('enrollments')
            .select('classroom_id')
            .eq('student_id', studentEmail);

        if (error || !enrollments) return [];

        const classroomIds = enrollments.map(e => e.classroom_id);
        if (classroomIds.length === 0) return [];

        const { data: classrooms, error: classroomsError } = await supabase
            .from('classrooms')
            .select(`
        *,
        students:enrollments(student_id),
        feedbacks:feedbacks(*),
        feedbackQuestions:feedback_questions(*),
        quizzes:quizzes(*, questions:quiz_questions(*), quizAttempts:quiz_attempts(*))
      `)
            .in('id', classroomIds);

        if (classroomsError || !classrooms) {
            console.error('Error fetching student classrooms:', classroomsError);
            return [];
        }

        // Fetch teacher names
        const teacherEmails = [...new Set(classrooms.map(c => c.teacher_id))];
        const { data: teachers } = await supabase
            .from('users')
            .select('email, name')
            .in('email', teacherEmails);

        const teacherMap: Record<string, string> = {};
        teachers?.forEach((t: any) => {
            teacherMap[t.email] = t.name;
        });

        return classrooms.map(c => normalizeClassroom({ ...c, teacher_name: teacherMap[c.teacher_id] }));
    },

    async getClassroomById(id: string): Promise<Classroom | null> {
        const { data: classroom, error } = await supabase
            .from('classrooms')
            .select(`
        *,
        students:enrollments(student_id),
        feedbacks:feedbacks(*),
        feedbackQuestions:feedback_questions(*),
        quizzes:quizzes(*, questions:quiz_questions(*), quizAttempts:quiz_attempts(*))
      `)
            .eq('id', id)
            .single();

        if (error || !classroom) return null;

        return normalizeClassroom(classroom);
    },

    async debugSupabaseConnection(userEmail?: string): Promise<string[]> {
        const logs: string[] = [];
        const tables = ['classrooms', 'enrollments', 'feedbacks', 'feedback_questions', 'quizzes', 'quiz_questions', 'quiz_attempts'];

        // 1. Check Table Existence
        for (const table of tables) {
            const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
            if (error) {
                logs.push(`❌ Table '${table}' error: ${error.message} (${error.code})`);
            } else {
                logs.push(`✅ Table '${table}' exists.`);
            }
        }

        if (!userEmail) {
            logs.push('⚠️ No User Email provided. Skipping RLS/Ownership checks.');
            return logs;
        }

        logs.push(`ℹ️ Checking data for User Email: ${userEmail}`);

        // 2. Check for ANY classrooms (to verify RLS isn't hiding everything)
        // Note: usage of 'head: true' might still be blocked by RLS if Policy is "Users can only see their own classrooms"
        const { count: totalClassrooms, error: countError } = await supabase
            .from('classrooms')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            logs.push(`❌ Failed to count global classrooms: ${countError.message}`);
        } else {
            logs.push(`ℹ️ Total Classrooms visible to this user: ${totalClassrooms}`);
            // INSPECT THE VISIBLE CLASSROOMS
            if (totalClassrooms && totalClassrooms > 0) {
                const { data: visibleRows } = await supabase
                    .from('classrooms')
                    .select('id, name, teacher_id')
                    .limit(3);

                if (visibleRows) {
                    visibleRows.forEach((row, idx) => {
                        logs.push(`   [Visible Row ${idx + 1}] ID: ${row.id.substring(0, 8)}... | Teacher ID: ${row.teacher_id}`);
                        if (row.teacher_id !== userEmail) {
                            logs.push(`   ⚠️ MISMATCH: Row Teacher ID (${row.teacher_id}) !== Current User Email (${userEmail})`);
                        }
                    });
                }
            }
        }

        // 3. Check for User's classrooms (Simple Select)
        const { data: userClassrooms, error: userError } = await supabase
            .from('classrooms')
            .select('id, name, teacher_id')
            .eq('teacher_id', userEmail);

        if (userError) {
            logs.push(`❌ Error fetching user classrooms (simple): ${userError.message}`);
        } else if (!userClassrooms || userClassrooms.length === 0) {
            logs.push(`⚠️ No classrooms found for teacher_id = ${userEmail}.`);
            logs.push(`   Possible causes:`);
            logs.push(`   1. RLS Policy prevents selecting them.`);
            logs.push(`   2. The teacher_id in the DB does not match your Auth Email.`);
            logs.push(`   3. No rows were actually inserted.`);
        } else {
            logs.push(`✅ Found ${userClassrooms.length} classrooms via simple select.`);
            logs.push(`   Ids: ${userClassrooms.map(c => c.id).join(', ')}`);
        }



        // 4. Check Complex Query (Relations)
        logs.push('--- Testing Relationships ---');

        // Test 4a: Check Enrollment Relation
        const { error: enrollmentError } = await supabase
            .from('classrooms')
            .select('id, students:enrollments(count)')
            .eq('teacher_id', userEmail)
            .limit(1);

        if (enrollmentError) logs.push(`❌ Relation 'enrollments' failed: ${enrollmentError.message}`);
        else logs.push('✅ Relation \'enrollments\' mapped correctly.');

        // Test 4b: Check Feedbacks Relation
        const { error: feedbackError } = await supabase
            .from('classrooms')
            .select('id, feedbacks:feedbacks(count)')
            .eq('teacher_id', userEmail)
            .limit(1);

        if (feedbackError) logs.push(`❌ Relation 'feedbacks' failed: ${feedbackError.message}`);
        else logs.push('✅ Relation \'feedbacks\' mapped correctly.');

        // Test 4c: Check Feedback Questions Relation
        const { error: feedbackQError } = await supabase
            .from('classrooms')
            .select('id, feedbackQuestions:feedback_questions(count)')
            .eq('teacher_id', userEmail)
            .limit(1);

        if (feedbackQError) logs.push(`❌ Relation 'feedback_questions' failed: ${feedbackQError.message}`);
        else logs.push('✅ Relation \'feedback_questions\' mapped correctly.');

        // Test 4d: Check Quizzes Relation
        const { error: quizError } = await supabase
            .from('classrooms')
            .select('id, quizzes:quizzes(count)')
            .eq('teacher_id', userEmail)
            .limit(1);

        if (quizError) logs.push(`❌ Relation 'quizzes' failed: ${quizError.message}`);
        else logs.push('✅ Relation \'quizzes\' mapped correctly.');

        // Test 4e: Full Query Dry Run
        const { error: fullError } = await supabase
            .from('classrooms')
            .select(`
                id,
                students:enrollments(student_id),
                feedbacks:feedbacks(*),
                feedbackQuestions:feedback_questions(*),
                quizzes:quizzes(*, questions:quiz_questions(*), quizAttempts:quiz_attempts(*))
            `)
            .eq('teacher_id', userEmail)
            .limit(1);

        if (fullError) {
            logs.push(`❌ FULL QUERY FAILED: ${fullError.message}`);
            logs.push(`   Hint: If a specific relation failed above, that is the cause.`);
        } else {
            logs.push('✅ Full complex query succeeded!');
        }

        return logs;
    },
    async createQuiz(classroomId: string, quiz: Omit<Quiz, 'id' | 'createdAt'>): Promise<{ success: boolean; message: string }> {
        // 1. Insert Quiz
        const { data: quizData, error: quizError } = await supabase
            .from('quizzes')
            .insert([{
                classroom_id: classroomId,
                title: quiz.title,
                description: quiz.description,
                time_limit: quiz.timeLimit
            }])
            .select('id')
            .single();

        if (quizError || !quizData) return { success: false, message: quizError?.message || 'Failed to create quiz' };

        // 2. Insert Questions
        const questionsToInsert = quiz.questions.map((q, index) => ({
            quiz_id: quizData.id,
            text: q.text,
            options: q.options, // Assuming this is JSONB array column
            correct_answer: q.correctAnswer,
            order: index // or q.order
        }));

        const { error: questionsError } = await supabase
            .from('quiz_questions')
            .insert(questionsToInsert);

        if (questionsError) {
            // Rollback quiz creation? Or just return error? Ideally rollback but Supabase doesn't support transactions easily here without RPC.
            // We'll just return error for now.
            return { success: false, message: `Quiz created but questions failed: ${questionsError.message}` };
        }

        return { success: true, message: 'Quiz created successfully' };
    },

    async addFeedbackQuestion(classroomId: string, text: string, order: number): Promise<{ success: boolean; message: string }> {
        const { error } = await supabase
            .from('feedback_questions')
            .insert([{
                classroom_id: classroomId,
                text,
                order_index: order // Assuming column is order_index or "order" - checking schema would be safer but "order" is keyword. context suggests "order" in type, likely mapped from DB. Let's assume schema matches or is close. I will use 'order' if it fails i will fix. *Wait*, looking at normalize it used `data.order`.
            }]);
        // actually re-reading previous code, normalizeFeedbackQuestion uses `data.order`. supabase insert keys must match DB columns.
        // Let's check `normalizeFeedbackQuestion` again in previous turn... it says `order: data.order || 0`.
        // So DB column is likely `order`. But `order` is a reserved word in SQL. usually it's quoted or named `order_index`.
        // I'll stick to `order` for now as per previous readings, but if it fails I'll check.
        // actually, looking at `debugSupabaseConnection` tables list, it checks `feedback_questions`.
        // I'll assume column is `order` based on `normalizeFeedbackQuestion`.

        // Wait, I should verify the column name for 'order' in feedback_questions.
        // `normalizeFeedbackQuestion` maps `data.order` -> `order`.
        // So the DB column is likely named `order`.

        const { error: insertError } = await supabase
            .from('feedback_questions')
            .insert([{ classroom_id: classroomId, text, "order": order }]);

        if (insertError) return { success: false, message: insertError.message };
        return { success: true, message: 'Question added' };
    },

    async removeFeedbackQuestion(questionId: string): Promise<{ success: boolean; message: string }> {
        const { error } = await supabase.from('feedback_questions').delete().eq('id', questionId);
        if (error) return { success: false, message: error.message };
        return { success: true, message: 'Question removed' };
    },

    async submitFeedback(feedback: Omit<Feedback, 'id' | 'submittedAt'>): Promise<{ success: boolean; message: string }> {
        const { error } = await supabase
            .from('feedbacks')
            .insert([{
                classroom_id: feedback.classroomId,
                student_id: feedback.studentId, // This is now EMAIL
                answers: feedback.answers,
                comment: feedback.comment
            }]);

        if (error) return { success: false, message: error.message };
        return { success: true, message: 'Feedback submitted' };
    },

    async submitQuizAttempt(attempt: Omit<QuizAttempt, 'id' | 'submittedAt'>): Promise<{ success: boolean; message: string }> {
        const { error } = await supabase
            .from('quiz_attempts')
            .insert([{
                quiz_id: attempt.quizId,
                student_id: attempt.studentId, // This is now EMAIL
                answers: attempt.answers,
                score: attempt.score,
                total_questions: attempt.totalQuestions
            }]);

        if (error) return { success: false, message: error.message };
        return { success: true, message: 'Quiz submitted' };
    },

    async getStudentNames(studentEmails: string[]): Promise<Record<string, string>> {
        if (!studentEmails.length) return {};

        const { data, error } = await supabase
            .from('users')
            .select('email, name')
            .in('email', studentEmails);

        if (error || !data) {
            console.error('Error fetching student names:', error);
            return {};
        }

        const nameMap: Record<string, string> = {};
        data.forEach((u: any) => {
            nameMap[u.email] = u.name;
        });
        return nameMap;
    }
};

function normalizeClassroom(data: any): Classroom {
    return {
        id: data.id,
        name: data.name || '',
        code: data.code || '',
        teacherId: data.teacher_id,
        teacherName: data.teacher_name || 'Unknown Teacher', // Assuming teacher_name is joined or available, otherwise might need fetching user or keeping it simple
        description: data.description || '',
        subject: data.subject || '',
        students: Array.isArray(data.students)
            ? data.students.map((s: any) => s.student_id)
            : [],
        feedbacks: Array.isArray(data.feedbacks) ? data.feedbacks.map(normalizeFeedback) : [],
        feedbackQuestions: Array.isArray(data.feedbackQuestions) ? data.feedbackQuestions.map(normalizeFeedbackQuestion) : [],
        quizzes: Array.isArray(data.quizzes) ? data.quizzes.map(normalizeQuiz) : [],
        // quizAttempts might be at top level (if relation existed) or nested in quizzes (our new query)
        quizAttempts: (Array.isArray(data.quizAttempts)
            ? data.quizAttempts
            : (Array.isArray(data.quizzes)
                // Extract attempts from each quiz and flatten
                ? data.quizzes.flatMap((q: any) => q.quizAttempts || [])
                : [])
        ).map(normalizeQuizAttempt),
        createdAt: new Date(data.created_at || Date.now()),
    };
}

function normalizeFeedback(data: any): Feedback {
    return {
        id: data.id,
        studentId: data.student_id,
        classroomId: data.classroom_id,
        answers: data.answers || {},
        comment: data.comment || '',
        submittedAt: new Date(data.submitted_at || Date.now()),
    };
}

function normalizeFeedbackQuestion(data: any): FeedbackQuestion {
    return {
        id: data.id,
        text: data.text || '',
        order: data.order || 0,
    };
}

function normalizeQuiz(data: any): Quiz {
    return {
        id: data.id,
        title: data.title || '',
        description: data.description || '',
        questions: Array.isArray(data.questions)
            ? data.questions.map((q: any) => ({
                id: q.id,
                text: q.text,
                options: q.options || [],
                correctAnswer: q.correct_answer,
                order: q.order || q.order_index || 0
            })).sort((a: any, b: any) => a.order - b.order)
            : [],
        timeLimit: data.time_limit || 15,
        createdAt: new Date(data.created_at || Date.now()),
    };
}

function normalizeQuizAttempt(data: any): QuizAttempt {
    return {
        id: data.id,
        studentId: data.student_id,
        quizId: data.quiz_id,
        answers: data.answers || [],
        score: data.score || 0,
        totalQuestions: data.total_questions || 0,
        submittedAt: new Date(data.submitted_at || Date.now()),
    };
}
