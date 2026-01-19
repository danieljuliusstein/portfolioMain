# How to Add More Projects

## Adding Featured Projects

Edit `featured-projects.json` and add new entries with this format:

```json
{
  "id": "unique-project-id",
  "title": "Your Project Title",
  "description": "A compelling description of your project. Explain what it does, why it matters, and what problem it solves. This appears on the featured carousel.",
  "technologies": ["Python", "React", "Node.js", "Your", "Tech", "Stack"],
  "image": "images/your-project-image.png",
  "imageAlt": "Descriptive alt text for accessibility",
  "repoUrl": "https://github.com/yourusername/your-repo",
  "demoUrl": "https://your-live-demo.com",
  "featured": true,
  "badge": "Featured"
}
```

### Badge Options
- "Featured" - For standout projects
- "Latest" - For recent work
- "Award Winning" - For recognized projects
- "In Progress" - For ongoing work
- "Coming Soon" - For planned projects
- Or create your own!

## Adding Regular Projects

Edit `projects.json` with this format:

```json
{
  "title": "Project Name",
  "description": "Short description for project cards",
  "longDescription": "Longer description that appears in the modal when users click 'View Details'",
  "tags": ["Tag1", "Tag2", "Tag3"],
  "thumbnail": "images/thumbnail.png",
  "thumbnailAlt": "Alt text for thumbnail",
  "image": "images/full-size.png",
  "imageAlt": "Alt text for full image",
  "repoUrl": "https://github.com/...",
  "demoUrl": "https://... (optional)"
}
```

## Image Guidelines

### For Featured Projects
- **Recommended size**: 800x600px or 1200x900px
- **Format**: PNG or JPG
- **Aspect ratio**: 4:3 or 16:9
- Save in `/images/` folder

### For Regular Projects
- **Thumbnail**: 400x300px (shown on cards)
- **Full image**: 800x600px (shown in modal)
- **Format**: PNG or JPG
- Save in `/images/` folder

## Tips for Great Project Descriptions

### Featured Projects (longer)
- Start with the problem you solved
- Explain your approach and key technologies
- Highlight unique features or innovations
- Mention impact/results if available
- Keep it 2-3 sentences max

### Regular Projects (shorter)
- One sentence describing what it does
- Focus on the most impressive aspect
- Keep technical but understandable

## Example: Adding a New Featured Project

1. Add your project image to `/images/` folder (e.g., `my-awesome-app.png`)

2. Add to `featured-projects.json`:
```json
{
  "id": "awesome-app",
  "title": "My Awesome App",
  "description": "A revolutionary mobile application that helps users track their fitness goals with AI-powered recommendations. Built with React Native and TensorFlow, reaching 10K+ active users in first month.",
  "technologies": ["React Native", "TensorFlow", "Node.js", "MongoDB", "AWS"],
  "image": "images/my-awesome-app.png",
  "imageAlt": "My Awesome App interface screenshot",
  "repoUrl": "https://github.com/danieljuliusstein/awesome-app",
  "demoUrl": "https://awesome-app.com",
  "featured": true,
  "badge": "Latest"
}
```

3. Refresh the page - it will automatically appear in the carousel!

## Order Matters

- Projects appear in the order they're listed in the JSON
- Put your best/most impressive projects first
- The first project shows by default

## Need Help?

- Check the existing projects for examples
- Make sure your JSON syntax is valid (use a JSON validator)
- Images should be optimized (compress large files)
- Test on mobile - descriptions should be readable at smaller sizes
