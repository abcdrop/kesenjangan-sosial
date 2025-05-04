export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { path: filePath } = req.query;
      
      const response = await fetch(
        `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${filePath}?ref=${process.env.GITHUB_BRANCH || 'main'}`,
        {
          headers: {
            'Authorization': `token ${process.env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch file from GitHub');
      }

      const data = await response.json();
      res.status(200).json(data);
    } catch (error) {
      console.error('GitHub API error:', error);
      res.status(500).json({ error: 'Failed to fetch file from GitHub' });
    }
  } else if (req.method === 'POST') {
    try {
      const { path: filePath, content, message } = req.body;
      
      // First try to get the file to check if it exists
      let sha;
      try {
        const response = await fetch(
          `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${filePath}?ref=${process.env.GITHUB_BRANCH || 'main'}`,
          {
            headers: {
              'Authorization': `token ${process.env.GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          sha = data.sha;
        }
      } catch (e) {
        // File doesn't exist, sha will be undefined
      }

      const putResponse = await fetch(
        `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${filePath}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${process.env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: message || 'Update file',
            content: Buffer.from(content).toString('base64'),
            sha,
            branch: process.env.GITHUB_BRANCH || 'main'
          })
        }
      );

      if (!putResponse.ok) {
        throw new Error('Failed to update file on GitHub');
      }

      const data = await putResponse.json();
      res.status(200).json(data);
    } catch (error) {
      console.error('GitHub API error:', error);
      res.status(500).json({ error: 'Failed to update file on GitHub' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
