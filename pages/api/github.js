import fs from 'fs';
import path from 'path';
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const owner = process.env.GITHUB_OWNER;
const repo = process.env.GITHUB_REPO;
const branch = process.env.GITHUB_BRANCH || 'main';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { path: filePath } = req.query;
      
      const response = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: branch
      });

      res.status(200).json(response.data);
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
        const existingFile = await octokit.repos.getContent({
          owner,
          repo,
          path: filePath,
          ref: branch
        });
        sha = existingFile.data.sha;
      } catch (e) {
        // File doesn't exist, sha will be undefined
      }

      const response = await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: filePath,
        message: message || 'Update file',
        content: Buffer.from(content).toString('base64'),
        sha,
        branch
      });

      res.status(200).json(response.data);
    } catch (error) {
      console.error('GitHub API error:', error);
      res.status(500).json({ error: 'Failed to update file on GitHub' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
