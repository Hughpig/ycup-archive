import { handleApiError, jsonResponse, type ApiFunction } from '../lib/d1';

export const onRequestGet: ApiFunction = async ({ env }) => {
  try {
    const { results } = await env.DB.prepare(
      `SELECT r.person_id, p.display_name, p.external_id, p.class_name, p.gender,
              r.rating, r.contest_count
       FROM person_ratings r
       JOIN persons p ON p.id = r.person_id
       ORDER BY r.rating DESC, p.display_name`
    ).all();
    return jsonResponse({ ok: true, ratings: results });
  } catch (error) {
    return handleApiError(error);
  }
};
