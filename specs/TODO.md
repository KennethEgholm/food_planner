# TODO List
## This file is for tracking tasks and features that need to be implemented in the Food Planner project.
## Do NOT implement anything from this file until it has been moved to the main specification file (spec.md) and approved by the project manager.

### Ideas
- Have an AI read through online offers and suggest meals based on the ingredients on sale.
- Search through online offers to find the best shopping strategy given a meal plan.
- Align the views so they look more consistent and professional.

### Issues
- ~~Check Containers for warnings / dependency errors~~ Compose files validate; dependency advisories cleared via `npm audit fix`.
- ~~When I add a new ingredient to the list, the energy density measure is not updated. I need to browse away or manually refresh the page.~~ Root cause: the server autofills calories *after* responding, so the client's immediate refetch cached `null`. Fixed: `InputIngredient` now polls the new ingredient until the value arrives.

