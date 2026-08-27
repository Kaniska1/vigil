Schema-driven standalone agent workflow.

- Repository/PR fields are no longer hardcoded.
- Inputs render from Agent.inputSchema.
- Google Search Researcher renders query only.
- GitHub/Security reviewers render repository + pullRequest because their definitions require them.
- Future developer-published agents automatically get their own playground fields.
- Backend validates input against the selected agent schema before queueing.
- File inputs remain disabled until Vigil's file-storage/reference service is implemented.
