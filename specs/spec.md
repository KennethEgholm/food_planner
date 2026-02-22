# Food Planner
## Overview
Food Planner is a web application designed to help users plan their meals for the week. It allows users to create meal plans and  generate shopping lists.
## Features
- **Meal Plan**: 
    - Users can create meal plans for each day of the week. Dinner only.
    - User can choos to have nothing selected for any given day.
    - A meal can be marked "Suitable for weekends".
    - A meal plan can be generated "randomly".
    - Only meals marked "Suitable for weekends" will be selected for Saturday and Sunday when generating a meal plan randomly.
    - A meal plan can have zero or more snacks associated with it.

- **Ingredient Management**: 
    - Meals have associated ingredients.
    - An ingredient can be associated with multiple meals.
    - An ingredient has a name and a unit.
        - Units can be one of: 
            - gram
            - centiliter
            - deciliter
            - stk
- **Meals**: Users can create meals and associate them with ingredients. A meal has a name and a list of ingredients with their respective quantities.
- **Snacks**: Snacks is a category similar to meals. They also consist of ingredients.

- **Shopping List Generation**: 
    - Users can generate a shopping list based on their meal plan, which aggregates the required ingredients and their quantities for the week.
    - The shopping list can be shared with Google Tasks by uploading it via their API.

## Technical Specifications
- **Frontend**: React.js for building the user interface. Must be fully functional on a mobile device.
- **Backend**: Node.js with Express for handling API requests and managing data.
- **Database**: SQLite for storing meal plans, meals, and ingredients.
- **API**: RESTful API for communication between the frontend and backend.
- The application uses a monorepository structure, with separate folders for the frontend and backend code.
- Typescript is used for both frontend and backend development to ensure type safety and improve code quality.
- Application is containerized using Docker to ensure consistency across different environments and simplify deployment.

## User Stories
1. As a user, I want to create a meal plan for the week so that I can organize my meals.
2. As a user, I want to add meals to my meal plan so that I can specify what I will eat each day.
3. [x] As a user, I want to be able to have a plan created for me with random choices of meals so that I can have a plan without having to choose meals myself.
4. As a user, I want to be able to view my meal plan so that I can see what I will be eating each day.
5. As a user, I want to generate a shopping list based on my meal plan so that I can easily shop for the ingredients I need.
6. [x] As a user, I want to be able to CRUD ingredients.
7. [x] As a user, I have to be able to CRUD meals.
8. [x] As a user, I want to be able to CRUD meal plans.
