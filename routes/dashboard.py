import sqlite3
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import json
# from database import get_db_connection

dashboard_bp = Blueprint('dashboard', __name__)


def get_instructor_id(user_id):
    """Retrieves the instructor ID from a user ID."""
    conn = None
    instructor = conn.execute('SELECT id FROM instructors WHERE user_id = ?', (user_id,)).fetchone()
    conn.close()
    return instructor['id'] if instructor else None


@dashboard_bp.route('/instructor-main', methods=['GET'])
#@jwt_required()
def get_instructor_main_dashboard_data():
    """
    Provides a set of data for the main instructor dashboard.
    """
    print('entered dashboard fxn')
    # user_id = get_jwt_identity()
    user_id = "0"
    print('got user id')
    instructor_id = get_instructor_id(user_id)
    print('got instructor ids')

    if not instructor_id:
        print('instructor Id not found')
        # return jsonify({"error": "Instructor profile not found for this user."}), 404

    conn = get_db_connection()

    try:
        # --- 1. Key Metrics ---
        total_learners_query = """
            SELECT COUNT(DISTINCT cl.learner_id) as count
            FROM course_learners cl
            JOIN courses c ON cl.course_id = c.id
            WHERE c.instructor_id = ?;
        """
        total_learners = conn.execute(total_learners_query, (instructor_id,)).fetchone()['count']

        active_courses = conn.execute(
            'SELECT COUNT(*) as count FROM courses WHERE instructor_id = ? AND is_active = 1;',
            (instructor_id,)
        ).fetchone()['count']

        authored_tutors_query = """
            SELECT COUNT(DISTINCT mt.tutor_id) as count
            FROM module_tutors mt
            JOIN modules m ON mt.module_id = m.id
            JOIN courses c ON m.course_id = c.id
            WHERE c.instructor_id = ?;
        """
        authored_tutors = conn.execute(authored_tutors_query, (instructor_id,)).fetchone()['count']

        # Engagement is calculated as the average completion percentage across all learners.
        # A more complex metric could be developed, but this is a good starting point.
        avg_completion_query = """
            SELECT AVG(lt.completion_percentage) as avg_comp
            FROM learner_tutors lt
            JOIN course_learners cl ON lt.learner_id = cl.learner_id
            JOIN courses c ON cl.course_id = c.id
            WHERE c.instructor_id = ?;
        """
        avg_comp = conn.execute(avg_completion_query, (instructor_id,)).fetchone()['avg_comp']

        engagement_label = "Low"
        if avg_comp:
            if avg_comp > 75:
                engagement_label = "High"
            elif avg_comp > 40:
                engagement_label = "Medium"

        metrics = {
            "totalLearners": total_learners or 0,
            "activeCourses": active_courses or 0,
            "authoredTutors": authored_tutors or 0,
            "avgEngagement": engagement_label
        }

        # --- 2. Courses List (Top 4 most recently updated) ---
        courses_query = """
            SELECT
                c.id,
                c.title as name,
                (SELECT COUNT(*) FROM course_learners WHERE course_id = c.id) as learners,
                (SELECT COUNT(DISTINCT mt.tutor_id)
                 FROM module_tutors mt
                 JOIN modules m ON mt.module_id = m.id
                 WHERE m.course_id = c.id) as tutors
            FROM courses c
            WHERE c.instructor_id = ?
            ORDER BY c.updated_at DESC
            LIMIT 4;
        """
        courses = [dict(row) for row in conn.execute(courses_query, (instructor_id,)).fetchall()]

        # --- 3. Tutors List (Top 4 most recently updated) ---
        tutors_query = """
            SELECT
                t.id,
                t.title as name,
                (SELECT COUNT(*) FROM module_tutors WHERE tutor_id = t.id) as modules,
                c.title as course,
                CASE t.is_published WHEN 1 THEN 'Published' ELSE 'Draft' END as status
            FROM tutors t
            JOIN module_tutors mt ON t.id = mt.tutor_id
            JOIN modules m ON mt.module_id = m.id
            JOIN courses c ON m.course_id = c.id
            WHERE c.instructor_id = ?
            GROUP BY t.id
            ORDER BY t.updated_at DESC
            LIMIT 4;
        """
        tutors = [dict(row) for row in conn.execute(tutors_query, (instructor_id,)).fetchall()]

        # --- 4. Activity Feed (A synthesized feed from various tables) ---
        # NOTE: A dedicated audit/event table would be better for this in a real application.
        enrollment_activity_query = """
            SELECT
                'fa-user-plus' as icon, 'indigo' as color,
                u.first_name || ' ' || u.last_name as subject,
                'enrolled in' as action,
                c.title as object,
                cl.enrolled_date as time
            FROM course_learners cl
            JOIN learners l ON cl.learner_id = l.id
            JOIN users u ON l.user_id = u.id
            JOIN courses c ON cl.course_id = c.id
            WHERE c.instructor_id = ?
            ORDER BY cl.enrolled_date DESC LIMIT 2;
        """
        tutor_update_activity_query = """
            SELECT
                'fa-pencil-alt' as icon, 'yellow' as color,
                'Tutor' as subject,
                'was updated' as action,
                t.title as object,
                t.updated_at as time
            FROM tutors t
            JOIN module_tutors mt ON t.id = mt.tutor_id JOIN modules m ON mt.module_id = m.id JOIN courses c ON m.course_id = c.id
            WHERE c.instructor_id = ?
            GROUP BY t.id ORDER BY t.updated_at DESC LIMIT 2;
        """

        enroll_activities = conn.execute(enrollment_activity_query, (instructor_id,)).fetchall()
        tutor_activities = conn.execute(tutor_update_activity_query, (instructor_id,)).fetchall()

        # Combine and sort activities
        all_activities_raw = sorted(enroll_activities + tutor_activities, key=lambda x: x['time'], reverse=True)

        activity_feed = []
        for item in all_activities_raw[:4]:  # Limit to top 4 total activities
            # Here you would use a utility to convert timestamp to "x days ago"
            # For simplicity, we'll format it.
            activity_time = datetime.fromisoformat(item['time']).strftime('%b %d, %Y')
            text = f"<strong>{item['subject']}</strong> {item['action']} '<strong>{item['object']}</strong>'."
            activity_feed.append({
                "icon": item['icon'],
                "color": item['color'],
                "text": text,
                "time": activity_time
            })

        return jsonify({
            "metrics": metrics,
            "courses": courses,
            "tutors": tutors,
            "activityFeed": activity_feed
        })

    except Exception as e:
        # Log the error e
        return jsonify({"error": "An internal error occurred while fetching dashboard data."}), 500
    finally:
        conn.close()