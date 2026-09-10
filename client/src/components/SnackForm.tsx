import type React from "react";
import FoodItemForm, { type FoodItem } from "./FoodItemForm";

interface SnackFormProps {
	initialSnack?: FoodItem;
	readOnly?: boolean;
}

const SnackForm: React.FC<SnackFormProps> = ({
	initialSnack,
	readOnly = false,
}) => <FoodItemForm kind="snack" item={initialSnack} readOnly={readOnly} />;

export default SnackForm;
