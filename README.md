# Dijkstra’s Algorithm Visualizer

This is a client-side interactive visualizer for Dijkstra’s shortest path algorithm built with HTML, CSS and JavaScript. The project is ready to be deployed to GitHub Pages (serve `index.html` from the repository root).

Features
- Add nodes by clicking on the canvas.
- Add weighted undirected edges by toggling "Add Edge" and clicking two nodes (you'll be prompted for a weight).
- Pick a start and end node for visualization.
- Run Dijkstra’s algorithm (uses a min-heap priority queue) with animated exploration and distance updates.
- Sidebar shows current node, distances, and visited flags.
- Buttons: Run, Reset, Clear, Random Graph generator.
- Speed slider controls animation delay.

How to use
1. Open `https://hair2143.github.io/Dijkstra_Algorithm/` in your browser.
2. Add nodes by clicking. Click "Add Edge", click two nodes and enter a weight.
3. Use "Pick Start" and "Pick End" to choose endpoints.
4. Click Run to see the algorithm animate. Final shortest path will be highlighted in green.


How to use (Local)
1. install python
2. Open CMD and change the file directory to the file location
3. run the code 'python -m http.server 8000'
4. Then open http://localhost:8000

Development
- No build step — plain static files. Just open `index.html`.

Deploy to GitHub Pages
1. Create a repo and push these files at the root.
2. Enable GitHub Pages for the repository (branch: main, folder: root).

Notes / Limitations
- Edge weights must be non-negative numbers.
- Simple prompt() dialogs are used for weight input for simplicity; these can be replaced with a nicer modal if desired.

License: MIT
