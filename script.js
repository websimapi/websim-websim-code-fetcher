const urlInput = document.getElementById('urlInput');
const fetchBtn = document.getElementById('fetchBtn');
const loader = document.getElementById('loader');
const errorDiv = document.getElementById('error');
const codeOutput = document.getElementById('code-output');
const htmlCode = document.getElementById('htmlCode');
const cssCode = document.getElementById('cssCode');
const jsCode = document.getElementById('jsCode');

fetchBtn.addEventListener('click', fetchAndDisplayCode);
urlInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        fetchAndDisplayCode();
    }
});

async function fetchAndDisplayCode() {
    const url = urlInput.value.trim();
    if (!url) {
        showError('Please enter a URL.');
        return;
    }

    const urlPattern = /https:\/\/websim\.com\/@([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9-]+)\/(\d+)/;
    const match = url.match(urlPattern);

    if (!match) {
        showError('Invalid Websim URL format. Expected: https://websim.com/@username/slug/version');
        return;
    }

    const [, username, slug, version] = match;

    resetUI();
    loader.style.display = 'block';

    try {
        const projectInfoResponse = await fetch(`/api/v1/users/${username}/slugs/${slug}/revisions/${version}`);
        if (!projectInfoResponse.ok) {
            throw new Error(`Failed to fetch project info (${projectInfoResponse.status}): ${projectInfoResponse.statusText}`);
        }
        const projectInfo = await projectInfoResponse.json();
        const projectId = projectInfo.project.id;
        const projectVersion = projectInfo.project_revision.version;

        // Fetch HTML
        const htmlPromise = fetch(`/api/v1/projects/${projectId}/revisions/${projectVersion}/html`).then(res => {
            if (!res.ok) throw new Error(`Failed to fetch HTML (${res.status}): ${res.statusText}`);
            return res.text();
        });
        
        // Fetch Assets
        const assetsPromise = fetch(`/api/v1/projects/${projectId}/revisions/${projectVersion}/assets`).then(res => {
            if (!res.ok) throw new Error(`Failed to fetch assets list (${res.status}): ${res.statusText}`);
            return res.json();
        });

        const [htmlContent, { assets }] = await Promise.all([htmlPromise, assetsPromise]);

        htmlCode.textContent = htmlContent;

        let cssContent = '';
        let jsContent = '';
        
        const contentPromises = assets.map(async (asset) => {
            if (asset.path.endsWith('.css') || asset.path.endsWith('.js')) {
                 const assetContentResponse = await fetch(`/api/v1/projects/${projectId}/revisions/${projectVersion}/assets/${asset.path}/content`);
                 if(assetContentResponse.ok) {
                    const { content } = await assetContentResponse.json();
                    if (asset.path.endsWith('.css')) {
                        cssContent += `/* == ${asset.path} == */\n` + content + '\n\n';
                    } else if (asset.path.endsWith('.js')) {
                        jsContent += `// == ${asset.path} ==\n` + content + '\n\n';
                    }
                 } else {
                    console.warn(`Could not fetch content for ${asset.path}`);
                 }
            }
        });

        await Promise.all(contentPromises);

        cssCode.textContent = cssContent.trim() || '/* No CSS files found in project assets. */';
        jsCode.textContent = jsContent.trim() || '// No JavaScript files found in project assets.';

        loader.style.display = 'none';
        codeOutput.style.display = 'block';
        
        // Use Prism to highlight the code
        Prism.highlightAll();

    } catch (error) {
        console.error('Error fetching code:', error);
        showError(error.message);
        loader.style.display = 'none';
    }
}

function resetUI() {
    errorDiv.style.display = 'none';
    codeOutput.style.display = 'none';
    htmlCode.textContent = '';
    cssCode.textContent = '';
    jsCode.textContent = '';
}

function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    codeOutput.style.display = 'none';
}

// Set a default example URL for the user
urlInput.value = 'https://websim.com/@limitedleopard5950486/mecha-combat-card-game/86';

