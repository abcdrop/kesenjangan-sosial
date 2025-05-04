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
    // Handle file upload
    if (req.method === 'POST' && req.query.upload) {
      const { file, path, message } = req.body;
      
      const response = await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: message || `Upload ${path.split('/').pop()}`,
        content: file,
        branch
      });

      return res.status(200).json({
        success: true,
        content: response.data.content,
        url: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
      });
    }

    // Handle regular file operations
    if (req.method === 'GET') {
      const { path } = req.query;
      
      const response = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch
      });

      return res.status(200).json(response.data);
    }

    if (req.method === 'POST') {
      const { path, content, message } = req.body;
      
      // Check if file exists to get SHA
      let sha;
      try {
        const existingFile = await octokit.repos.getContent({
          owner,
          repo,
          path,
          ref: branch
        });
        sha = existingFile.data.sha;
      } catch (error) {
        if (error.status !== 404) throw error;
      }

      const response = await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: message || 'Update file',
        content: Buffer.from(content).toString('base64'),
        sha,
        branch
      });

      return res.status(200).json(response.data);
    }

    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error('GitHub API error:', error);
    return res.status(error.status || 500).json({
      error: error.message || 'Failed to process GitHub request',
      details: error.response?.data
    });
  }
}
