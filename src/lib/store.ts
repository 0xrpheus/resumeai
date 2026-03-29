import { writable } from "svelte/store";
import { browser } from "$app/environment";
import {
	DEFAULT_CONFIG,
	DEFAULT_HEADING,
	DEFAULT_EDUCATION,
	DEFAULT_EXPERIENCE,
	DEFAULT_PROJECTS,
	DEFAULT_SKILLS,
	DEFAULT_MAIN,
	SYSTEM_PROMPT,
} from "./defaults";

export type SectionKey =
	| "config"
	| "heading"
	| "education"
	| "experience"
	| "projects"
	| "skills"
	| "main"
	| "prompt";

export interface ResumeFiles {
	config: string;
	heading: string;
	education: string;
	experience: string;
	projects: string;
	skills: string;
	main: string;
	prompt: string;
}

export type AppStatus = "idle" | "rewriting" | "compiling" | "done" | "error";

const STORAGE_KEY_FILES = "resumai_files";
const STORAGE_KEY_APIKEY = "resumai_gemini_key";

function defaultFiles(): ResumeFiles {
	return {
		config: DEFAULT_CONFIG,
		heading: DEFAULT_HEADING,
		education: DEFAULT_EDUCATION,
		experience: DEFAULT_EXPERIENCE,
		projects: DEFAULT_PROJECTS,
		skills: DEFAULT_SKILLS,
		main: DEFAULT_MAIN,
		prompt: SYSTEM_PROMPT,
	};
}

// stores
export const resumeFiles = writable<ResumeFiles>(defaultFiles());
export const apiKey = writable<string>("");
export const jobDescription = writable<string>("");
export const activeSection = writable<SectionKey>("experience");
export const status = writable<AppStatus>("idle");
export const statusMessage = writable<string>("");
export const pdfUrl = writable<string | null>(null);
export const errorMessage = writable<string>("");

// client only
export function initStores() {
	if (!browser) return;

	// load from localStorage
	try {
		const raw = localStorage.getItem(STORAGE_KEY_FILES);
		if (raw) resumeFiles.set({ ...defaultFiles(), ...JSON.parse(raw) });
	} catch {}

	try {
		const key = localStorage.getItem(STORAGE_KEY_APIKEY);
		if (key) apiKey.set(key);
	} catch {}

	// wire up persistence — only runs client-side, after init
	resumeFiles.subscribe((files) => {
		try {
			localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(files));
		} catch {}
	});

	apiKey.subscribe((key) => {
		try {
			localStorage.setItem(STORAGE_KEY_APIKEY, key);
		} catch {}
	});
}

export function updateSection(key: SectionKey, value: string) {
	resumeFiles.update((f) => ({ ...f, [key]: value }));
}

export function resetToDefaults() {
	resumeFiles.set(defaultFiles());
	if (browser) {
		try {
			localStorage.removeItem(STORAGE_KEY_FILES);
		} catch {}
	}
}

export function applyRewrite(rewritten: {
	experience: string;
	projects: string;
	skills: string;
}) {
	resumeFiles.update((f) => ({
		...f,
		experience: rewritten.experience,
		projects: rewritten.projects,
		skills: rewritten.skills,
	}));
}
