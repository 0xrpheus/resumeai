import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

const execFileAsync = promisify(execFile);

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { files } = body;

	const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "resumai-"));

	try {
		await fs.writeFile(path.join(tmpDir, "config.tex"), files.config);
		await fs.writeFile(path.join(tmpDir, "main.tex"), files.main);

		const sectionsDir = path.join(tmpDir, "sections");
		await fs.mkdir(sectionsDir, { recursive: true });
		await fs.writeFile(
			path.join(sectionsDir, "heading.tex"),
			files.heading,
		);
		await fs.writeFile(
			path.join(sectionsDir, "education.tex"),
			files.education,
		);
		await fs.writeFile(
			path.join(sectionsDir, "experience.tex"),
			files.experience,
		);
		await fs.writeFile(
			path.join(sectionsDir, "projects.tex"),
			files.projects,
		);
		await fs.writeFile(path.join(sectionsDir, "skills.tex"), files.skills);

		// run tectonic
		let stdout = "";
		let stderr = "";
		try {
			const result = await execFileAsync(
				"tectonic",
				[
					"-X",
					"compile",
					"--outdir",
					tmpDir,
					path.join(tmpDir, "main.tex"),
				],
				{ timeout: 30000 },
			);
			stdout = result.stdout;
			stderr = result.stderr;
		} catch (execErr: unknown) {
			const e = execErr as {
				stdout?: string;
				stderr?: string;
				message?: string;
			};
			// tectonic exits non-zero on latex errors, stderr has the details
			const latexError =
				e.stderr ?? e.stdout ?? e.message ?? "tectonic failed";
			throw error(422, `LaTeX compilation error:\n${latexError}`);
		}

		const pdfPath = path.join(tmpDir, "main.pdf");
		let pdfBuffer: Buffer;
		try {
			pdfBuffer = await fs.readFile(pdfPath);
		} catch {
			throw error(
				500,
				`PDF not found after compilation. tectonic output: ${stderr}`,
			);
		}

		return new Response(new Uint8Array(pdfBuffer), {
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": 'inline; filename="resume.pdf"',
			},
		});
	} finally {
		// cleanup temp dir async, don't await
		fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
	}
};
