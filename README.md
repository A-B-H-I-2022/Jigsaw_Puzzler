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

The app is static and can be published with GitHub Pages:

1. Create a GitHub repository for this project and add these files.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select the `main` branch and `/ (root)`, then save.
4. Once GitHub Pages publishes the site, open its public URL, create a puzzle, and copy the solve link.

The solve link includes the image and puzzle state in its URL fragment. This means no image is uploaded to a server, but links can become very long for large images and may not work in services that truncate long URLs. Anyone with the link can see and play that puzzle.
