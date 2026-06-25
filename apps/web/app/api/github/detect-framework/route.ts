import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const repo = searchParams.get('repo'); // format: owner/repo
    const pathParam = searchParams.get('path') || '';

    if (!repo || !repo.includes('/')) {
      return NextResponse.json({ error: 'Invalid repository format. Expected owner/repo.' }, { status: 400 });
    }

    const [owner, repoName] = repo.split('/');

    // We will attempt to detect framework files from the default branches: main first, then master.
    const branches = ['main', 'master'];
    let detectedFramework: string | null = null;
    let detectedReason = '';
    let packageName = repoName;
    let fetchError = null;

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Rovel-App',
    };

    if (clientId && clientSecret) {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    for (const branch of branches) {
      try {
        const cleanPath = pathParam.trim().replace(/^\/+|\/+$/g, '');
        const packageJsonPath = cleanPath ? `${cleanPath}/package.json` : 'package.json';
        const goModPath = cleanPath ? `${cleanPath}/go.mod` : 'go.mod';
        const reqTxtPath = cleanPath ? `${cleanPath}/requirements.txt` : 'requirements.txt';
        const pyprojectPath = cleanPath ? `${cleanPath}/pyproject.toml` : 'pyproject.toml';

        // 1. Try package.json
        const packageJsonUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${packageJsonPath}?ref=${branch}`;
        const pResponse = await fetch(packageJsonUrl, { headers });

        if (pResponse.ok) {
          const fileData = await pResponse.json();
          if (fileData.content && fileData.encoding === 'base64') {
            const decoded = Buffer.from(fileData.content, 'base64').toString('utf-8');
            const packageJsonData = JSON.parse(decoded);
            packageName = packageJsonData.name || repoName;
            
            const deps = {
              ...(packageJsonData.dependencies || {}),
              ...(packageJsonData.devDependencies || {}),
            };

            if (deps['next']) {
              detectedFramework = 'nextjs';
              detectedReason = 'Detected "next" in package.json';
            } else if (deps['nuxt']) {
              detectedFramework = 'nuxt';
              detectedReason = 'Detected "nuxt" in package.json';
            } else if (deps['@sveltejs/kit'] || deps['svelte']) {
              detectedFramework = 'sveltekit';
              detectedReason = 'Detected "svelte" or "@sveltejs/kit" in package.json';
            } else if (deps['astro']) {
              detectedFramework = 'astro';
              detectedReason = 'Detected "astro" in package.json';
            } else if (deps['express']) {
              detectedFramework = 'express';
              detectedReason = 'Detected "express" in package.json';
            } else if (deps['react'] && (deps['vite'] || deps['@vitejs/plugin-react'] || deps['@vitejs/plugin-react-swc'])) {
              detectedFramework = 'react-vite';
              detectedReason = 'Detected "react" and "vite" in package.json';
            } else if (deps['react']) {
              detectedFramework = 'react-vite';
              detectedReason = 'Detected "react" in package.json';
            } else {
              detectedFramework = 'static';
              detectedReason = 'No specific framework dependencies detected in package.json';
            }
            break; // Found and parsed package.json successfully
          }
        }

        // 2. Try go.mod
        const goModUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${goModPath}?ref=${branch}`;
        const gResponse = await fetch(goModUrl, { headers });
        if (gResponse.ok) {
          detectedFramework = 'go';
          detectedReason = 'Detected "go.mod" file';
          break;
        }

        // 3. Try requirements.txt or pyproject.toml
        const reqTxtUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${reqTxtPath}?ref=${branch}`;
        const rResponse = await fetch(reqTxtUrl, { headers });
        if (rResponse.ok) {
          detectedFramework = 'python';
          detectedReason = 'Detected "requirements.txt" file';
          break;
        }

        const pyprojectUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${pyprojectPath}?ref=${branch}`;
        const pyResponse = await fetch(pyprojectUrl, { headers });
        if (pyResponse.ok) {
          detectedFramework = 'python';
          detectedReason = 'Detected "pyproject.toml" file';
          break;
        }
        
      } catch (err: any) {
        console.error(`Error detecting on branch ${branch}:`, err);
        fetchError = err.message;
      }
    }

    if (!detectedFramework) {
      return NextResponse.json({
        framework: 'static',
        detected: false,
        reason: fetchError || 'No supported project files (package.json, go.mod, requirements.txt) found in main or master branches',
      });
    }

    return NextResponse.json({
      framework: detectedFramework,
      detected: true,
      reason: detectedReason,
      packageName,
    });

  } catch (error: any) {
    console.error('Error in /api/github/detect-framework:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
