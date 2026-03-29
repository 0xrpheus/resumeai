<script lang="ts">
	import { onMount } from 'svelte';
	import {
		resumeFiles,
		apiKey,
		jobDescription,
		activeSection,
		status,
		statusMessage,
		pdfUrl,
		errorMessage,
		updateSection,
		applyRewrite,
		resetToDefaults,
		type SectionKey
	} from '$lib/store';

	const FILE_GROUPS = [
		{
			label: 'resume',
			files: [
				{ key: 'heading'    as SectionKey, label: 'heading.tex',    icon: 'H' },
				{ key: 'education'  as SectionKey, label: 'education.tex',  icon: 'E' },
				{ key: 'experience' as SectionKey, label: 'experience.tex', icon: 'X' },
				{ key: 'projects'   as SectionKey, label: 'projects.tex',   icon: 'P' },
				{ key: 'skills'     as SectionKey, label: 'skills.tex',     icon: 'S' },
			]
		},
		{
			label: 'config',
			files: [
				{ key: 'config' as SectionKey, label: 'config.tex', icon: 'C' },
				{ key: 'main'   as SectionKey, label: 'main.tex',   icon: 'M' },
			]
		},
		{
			label: 'ai',
			files: [
				{ key: 'prompt' as SectionKey, label: 'prompt.md', icon: '⚡' },
			]
		}
	];

	let sidebarCollapsed = $state(false);
	let showApiKey       = $state(false);
	let showJdModal      = $state(false);
	let showResetConfirm = $state(false);
	let jdDraft          = $state('');
	let editorValue      = $state('');
	let isLight          = $state(false);

	let mainAreaEl: HTMLElement;
	let editorWidth      = $state(50);
	let isDragging       = $state(false);

	onMount(() => {
		const saved = localStorage.getItem('resumai_theme');
		if (saved === 'light') isLight = true;
	});

	$effect(() => {
		document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
		localStorage.setItem('resumai_theme', isLight ? 'light' : 'dark');
	});

	$effect(() => {
		editorValue = $resumeFiles[$activeSection];
	});

	function onEditorInput(e: Event) {
		const val = (e.target as HTMLTextAreaElement).value;
		editorValue = val;
		updateSection($activeSection, val);
	}

	function onResizerPointerDown(e: PointerEvent) {
		isDragging = true;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}
	function onResizerPointerMove(e: PointerEvent) {
		if (!isDragging || !mainAreaEl) return;
		const rect = mainAreaEl.getBoundingClientRect();
		const pct = ((e.clientX - rect.left) / rect.width) * 100;
		editorWidth = Math.min(Math.max(pct, 20), 80);
	}
	function onResizerPointerUp() { isDragging = false; }

	const activeLabel = $derived(
		FILE_GROUPS.flatMap(g => g.files).find(f => f.key === $activeSection)?.label ?? $activeSection
	);

	async function handleGenerate() {
		if (!$apiKey.trim()) { $errorMessage = 'API key required.'; $status = 'error'; return; }
		if (!$jobDescription.trim()) { jdDraft = $jobDescription; showJdModal = true; return; }
		await runPipeline();
	}

	async function runPipeline() {
		$status = 'rewriting'; $statusMessage = 'rewriting...'; $errorMessage = '';
		try {
			const rr = await fetch('/api/rewrite', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ apiKey: $apiKey, jobDescription: $jobDescription, files: $resumeFiles })
			});
			if (!rr.ok) throw new Error(await rr.text());
			applyRewrite(await rr.json());

			$status = 'compiling'; $statusMessage = 'compiling...';
			await new Promise(r => setTimeout(r, 80));
			await compile($resumeFiles);
		} catch (err: unknown) {
			$status = 'error'; $statusMessage = 'error';
			$errorMessage = err instanceof Error ? err.message : String(err);
		}
	}

	async function compileOnly() {
		$status = 'compiling'; $statusMessage = 'compiling...'; $errorMessage = '';
		try { await compile($resumeFiles); }
		catch (err: unknown) {
			$status = 'error'; $statusMessage = 'error';
			$errorMessage = err instanceof Error ? err.message : String(err);
		}
	}

	async function compile(files: typeof $resumeFiles) {
		const cr = await fetch('/api/compile', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ files })
		});
		if (!cr.ok) throw new Error(await cr.text());
		const blob = await cr.blob();
		const url = URL.createObjectURL(blob);
		if ($pdfUrl) URL.revokeObjectURL($pdfUrl);
		$pdfUrl = url;
		$status = 'done'; $statusMessage = 'ready';
	}

	function downloadPdf() {
		if (!$pdfUrl) return;
		const a = document.createElement('a');
		a.href = $pdfUrl; a.download = 'resume.pdf'; a.click();
	}

	function openJdModal() { jdDraft = $jobDescription; showJdModal = true; }
	function confirmJd() { $jobDescription = jdDraft; showJdModal = false; }

	const isLoading = $derived($status === 'rewriting' || $status === 'compiling');

	function pillClass(s: string) {
		if (s === 'rewriting' || s === 'compiling') return 'pill loading';
		if (s === 'error') return 'pill error';
		if (s === 'done') return 'pill done';
		return 'pill';
	}
	function pillLabel(s: string, msg: string) {
		if (s === 'idle') return 'idle';
		return msg || s;
	}
</script>

<header class="topbar">
	<div class="topbar-brand">
		<span class="brand-name">resumai</span>
		<span class="brand-sub">latex optimizer</span>
	</div>

	<div class="topbar-center">
		<button class="jd-btn {$jobDescription ? 'active' : ''}" onclick={openJdModal}>
			{$jobDescription ? '✓ job description set' : '+ paste job description'}
		</button>
	</div>

	<div class="topbar-right">
        <button
    class="theme-toggle"
    onclick={() => isLight = !isLight}
    title={isLight ? 'switch to dark' : 'switch to light'}
>
    {#if isLight}
        <svg width="16px" height="16px" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 11.5066C3 16.7497 7.25034 21 12.4934 21C16.2209 21 19.4466 18.8518 21 15.7259C12.4934 15.7259 8.27411 11.5066 8.27411 3C5.14821 4.55344 3 7.77915 3 11.5066Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>
    {:else}
        <svg width="16px" height="16px" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M22 12L23 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 2V1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 23V22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M20 20L19 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M20 4L19 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M4 20L5 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M4 4L5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M1 12L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>
    {/if}
</button>
		<div class="apikey-row">
			<input
				class="input apikey-input"
				type={showApiKey ? 'text' : 'password'}
				placeholder="gemini api key"
				bind:value={$apiKey}
			/>
			<button class="btn btn-sm" onclick={() => showApiKey = !showApiKey}>
				{showApiKey ? 'hide' : 'show'}
			</button>
		</div>
	</div>
</header>

<div class="app-body">
	<aside class="sidebar {sidebarCollapsed ? 'collapsed' : ''}">
		<div class="sidebar-header">
			{#if !sidebarCollapsed}
				<span class="sidebar-title">explorer</span>
			{/if}
			<button class="collapse-btn" onclick={() => sidebarCollapsed = !sidebarCollapsed} title="toggle sidebar">
				{sidebarCollapsed ? '›' : '‹'}
			</button>
		</div>

		<nav class="sidebar-tree">
			{#each FILE_GROUPS as group}
				<div class="tree-group">
					{#if !sidebarCollapsed}
						<div class="tree-group-label">{group.label}</div>
					{/if}
					{#each group.files as file}
						<div
							class="tree-item {$activeSection === file.key ? 'active' : ''}"
							onclick={() => $activeSection = file.key}
							role="button"
							tabindex="0"
							onkeydown={(e) => e.key === 'Enter' && ($activeSection = file.key)}
							title={file.label}
						>
							<span class="tree-icon">{file.icon}</span>
							<span>{file.label}</span>
						</div>
					{/each}
				</div>
			{/each}
		</nav>

		{#if !sidebarCollapsed}
			<div class="sidebar-footer">
				<div class="sidebar-footer-actions">
                    <button class="btn btn-primary btn-full" onclick={handleGenerate} disabled={isLoading}>
    {#if isLoading}
        ...
    {:else}
        <svg width="14px" height="14px" viewBox="0 0 24 24" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline;vertical-align:middle;margin-right:5px"><path d="M8 15C12.8747 15 15 12.949 15 8C15 12.949 17.1104 15 22 15C17.1104 15 15 17.1104 15 22C15 17.1104 12.8747 15 8 15Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path><path d="M2 6.5C5.13376 6.5 6.5 5.18153 6.5 2C6.5 5.18153 7.85669 6.5 11 6.5C7.85669 6.5 6.5 7.85669 6.5 11C6.5 7.85669 5.13376 6.5 2 6.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path></svg>
        generate
    {/if}
</button>
					<button class="btn btn-full" onclick={compileOnly} disabled={isLoading}>compile only</button>
					{#if $pdfUrl}
						<button class="btn btn-full" onclick={downloadPdf}>↓ download pdf</button>
					{/if}
				</div>

				<div class="sidebar-footer-status">
					<span class="sidebar-footer-label">status</span>
					<span class="{pillClass($status)}">{pillLabel($status, $statusMessage)}</span>
				</div>

				{#if $status === 'error' && $errorMessage}
					<div class="error-box">
						<div class="error-title">error</div>
						<pre class="error-body">{$errorMessage}</pre>
					</div>
				{/if}

				<div class="sidebar-footer-reset">
					<button class="btn btn-sm btn-full" onclick={() => showResetConfirm = true}>reset to defaults</button>
				</div>
			</div>
		{/if}
	</aside>

	<main
		class="main-area"
		bind:this={mainAreaEl}
		onpointermove={onResizerPointerMove}
		onpointerup={onResizerPointerUp}
	>
		<div class="editor-pane-wrap" style="width: {editorWidth}%;">
			<div class="pane-header">
				<span class="pane-label">editor</span>
				<span class="active-file-name">{activeLabel}</span>
			</div>
			<textarea
				class="editor-textarea"
				spellcheck="false"
				autocomplete="off"
				value={editorValue}
				oninput={onEditorInput}
				placeholder="select a file from the sidebar..."
			></textarea>
		</div>

        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div
			class="resizer {isDragging ? 'dragging' : ''}"
			role="separator"
			aria-orientation="vertical"
			tabindex="0"
			onpointerdown={onResizerPointerDown}
		></div>

		<div class="preview-pane-wrap" style="flex: 1;">
			<div class="pane-header">
				<span class="pane-label">preview</span>
				{#if $pdfUrl}
					<span class="pill done">pdf ready</span>
				{/if}
			</div>
			<div class="preview-body {isLoading ? 'generating' : ''}">
				{#if $pdfUrl}
					<iframe src={$pdfUrl} title="Resume PDF Preview" class="pdf-frame"></iframe>
				{:else}
					<div class="preview-empty">
						<span class="preview-empty-glyph">▭</span>
						<span class="preview-empty-label">no preview yet</span>
						<span class="preview-empty-sub">compile or generate to render</span>
					</div>
				{/if}
			</div>
		</div>
	</main>
</div>

{#if showJdModal}
<div class="modal-backdrop" role="presentation" onclick={() => showJdModal = false}>
	<dialog open class="modal" aria-label="Job description" onclick={(e) => e.stopPropagation()}>
		<div class="modal-header">
			<span class="modal-title">job description</span>
			<button class="btn btn-sm" onclick={() => showJdModal = false}>✕ close</button>
		</div>
		<textarea
			class="modal-textarea"
			placeholder="paste the full job description here..."
			bind:value={jdDraft}
			spellcheck="false"
		></textarea>
		<div class="modal-footer">
			<button class="btn" onclick={() => showJdModal = false}>cancel</button>
			<button class="btn btn-primary" onclick={confirmJd}>confirm</button>
		</div>
	</dialog>
</div>
{/if}

{#if showResetConfirm}
<div class="modal-backdrop" role="presentation" onclick={() => showResetConfirm = false}>
	<dialog open class="modal modal-sm" aria-label="Reset confirmation" onclick={(e) => e.stopPropagation()}>
		<div class="modal-header">
			<span class="modal-title">reset to defaults?</span>
		</div>
		<p class="modal-body-text">all tex files will revert to the default template. your api key is unaffected. this cannot be undone.</p>
		<div class="modal-footer">
			<button class="btn" onclick={() => showResetConfirm = false}>cancel</button>
			<button class="btn btn-danger" onclick={() => { resetToDefaults(); showResetConfirm = false; }}>reset</button>
		</div>
	</dialog>
</div>
{/if}
