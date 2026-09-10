import type React from "react";
import FoodItemForm, { type FoodItem } from "./FoodItemForm";

interface MealFormProps {
	initialMeal?: FoodItem;
	readOnly?: boolean;
	noTrigger?: boolean;
}

const MealForm: React.FC<MealFormProps> = ({
	initialMeal,
	readOnly = false,
	noTrigger = false,
}) => (
	<FoodItemForm
		kind="meal"
		item={initialMeal}
		readOnly={readOnly}
		noTrigger={noTrigger}
	/>
);

export default MealForm;
