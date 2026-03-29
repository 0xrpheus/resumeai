import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { SYSTEM_PROMPT } from "$lib/defaults";

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { apiKey, jobDescription, files } = body;
	const systemPrompt: string = files.prompt?.trim() || SYSTEM_PROMPT;

	if (!apiKey?.trim()) throw error(400, "No API key provided");
	if (!jobDescription?.trim())
		throw error(400, "No job description provided");

	const userMessage = `
JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME SECTIONS:

--- experience.tex ---
${files.experience}

--- projects.tex ---
${files.projects}

--- skills.tex ---
${files.skills}
`.trim();

	const geminiRes = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				system_instruction: { parts: [{ text: systemPrompt }] },
				contents: [{ role: "user", parts: [{ text: userMessage }] }],
				generationConfig: {
					temperature: 0.4,
					maxOutputTokens: 8192,
					responseMimeType: "application/json",
				},
			}),
		},
	);

	if (!geminiRes.ok) {
		const errText = await geminiRes.text();
		throw error(502, `Gemini API error: ${errText}`);
	}

	const geminiData = await geminiRes.json();
	const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

	// strip markdown fences if gemini wraps in ```json
	const cleaned = raw
		.replace(/^```json\s*/i, "")
		.replace(/\s*```$/, "")
		.trim();

	let parsed: { experience: string; projects: string; skills: string };
	try {
		parsed = JSON.parse(cleaned);
	} catch {
		throw error(
			500,
			`Failed to parse Gemini response as JSON. Raw: ${raw.slice(0, 300)}`,
		);
	}

	if (!parsed.experience || !parsed.projects || !parsed.skills) {
		throw error(500, "Gemini response missing expected fields");
	}

	return json(parsed);
};
