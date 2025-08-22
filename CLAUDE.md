# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

GhostWriter2 is an Electron + React TypeScript desktop writing application.

Main directory: `ghostwriter2/`

## Development Commands

```bash
cd ghostwriter2

# Development (runs React dev server + Electron)
npm run electron-dev

# Build for production
npm run build-electron

# Run tests
npm test

# React only (web browser)
npm start
```

## Architecture

- **Frontend**: React with TypeScript
- **Desktop**: Electron wrapper with IPC for file operations
- **Main Process**: `public/electron.js` - handles file system operations
- **Preload Script**: `public/preload.js` - exposes secure APIs to renderer
- **Renderer**: React app in `src/` with rich text editor and formatting

## File System Structure

Each novel creates a folder in `Documents/GhostWriter Novels/[Novel Name]/`:
- `novel.json` - Project metadata and chapter list
- `chapter-01.md` - Individual chapter files in Markdown
- `chapter-02.md` - Auto-numbered and saved
- etc.

## Key Features

- **Auto-save**: Chapters save automatically after 2 seconds of inactivity
- **Rich Text Editor**: Full formatting toolbar with Bold/Italic/Underline/etc.
- **Chapter Management**: Create, rename, delete, and navigate chapters
- **Project Management**: Create new novels or open existing ones
- **GhostWriter AI**: Integrated AI writing assistant (placeholder)
- This app is called "GhostWriter". It is an AI-assisted novel writing platform which allows someone with the seed of an idea to use AI to write and structure, chapter by chapter, until they have a completed novel. The app keeps track of characters, plot arcs, and more, while dynamically writing the story alongside the user.
- The ghost emoji is the brand face
- Brand Style should use Hex Code information from Intuit at https://brandfetch.com/intuit.com