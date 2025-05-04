import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

export default async function handler(req, res) {
  const { owner, repo, branch } = {
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
    branch: process.env.GITHUB_BRANCH || 'main'
  };

  try {
    // Handle file upload with proper URL formatting
    if (req.method === 'POST' && req.query.upload) {
      const formData = await req.formData();
      const file = formData.get('file');
      const path = formData.get('path');
      
      const fileBuffer = await file.arrayBuffer();
      const content = Buffer.from(fileBuffer).toString('base64');

      const response = await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: `Upload ${path.split('/').pop()}`,
        content,
        branch
      });

      // Ensure no spaces in URL construction
      const imageUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`.replace(/\s+/g, '');

      return res.status(200).json({
        success: true,
        content: response.data.content,
        url: imageUrl
      });
    }

    // [Rest of the API code remains the same...]
  } catch (error) {
    console.error('GitHub API error:', error);
    return res.status(error.status || 500).json({
      error: error.message || 'Failed to process GitHub request'
    });
  }
}
