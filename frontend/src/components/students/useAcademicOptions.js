import { useEffect, useState } from "react";
import api from "../../services/api";

const list = (path) => api.get(path, { params: { page_size: 200 } }).then((res) => res.data.results);

/** "Semester 3 · 2026-27" */
export const semesterLabel = (s) => `${s.name} · ${s.academic_year_name}`;

/** "Section A", with the semester when the section is tied to one. */
export const sectionLabel = (s, withCourse = false) =>
  [withCourse && s.course_name, `Section ${s.name}`, s.semester_label].filter(Boolean).join(" · ");

/**
 * The academic records a student can be linked to: departments, courses,
 * semesters and sections. Each has an `id`, which is what gets saved.
 */
export function useAcademicOptions() {
  const [state, setState] = useState({ departments: [], courses: [], semesters: [], sections: [], ready: false });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      list("/academics/departments/"),
      list("/academics/courses/"),
      list("/academics/semesters/"),
      list("/academics/sections/"),
    ])
      .then(([departments, courses, semesters, sections]) => {
        if (!cancelled) setState({ departments, courses, semesters, sections, ready: true });
      })
      .catch(() => !cancelled && setState((s) => ({ ...s, ready: true }))); // dropdowns just stay empty
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
