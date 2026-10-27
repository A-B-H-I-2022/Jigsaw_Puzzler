# Jigsaw Puzzle Builder

A lightweight browser-based jigsaw puzzle app that lets you:

- Upload any image
- Choose puzzle dimensions from the available options
- Drag and drop tiles to rebuild the image
- Copy a shareable solve link for the current puzzle when the app is publicly hosted
- See a completion pop-up when the picture is fully solved

## Run locally

Open `index.html` directly in a browser, or serve the folder locally. Locally created links are not shareable with other people.

```bash
cd "C:\Users\jithu\.vscode\Jigsaw_Puzzler"
python -m http.server 8000
```

Then visit http://localhost:8000

## Publish and share

The app is static and includes a GitHub Actions workflow for publishing this branch with GitHub Pages:

1. In the repository, open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push a change to the `feature/jigsaw-puzzler` branch, or manually run **Deploy to GitHub Pages** from the **Actions** tab.
4. Wait for the workflow to complete, then open the deployed URL shown in the workflow run's `github-pages` environment.
5. Create a puzzle on that public page and copy the solve link.

The solve link includes the image and puzzle state in its URL fragment. This means no image is uploaded to a server, but links can become very long for large images and may not work in services that truncate long URLs. Anyone with the link can see and play that puzzle.
