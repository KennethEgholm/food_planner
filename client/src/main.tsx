import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./ThemeProvider";

createRoot(document.getElementById("root")!).render(
	<ThemeProvider>
		<BrowserRouter>
			<App />
		</BrowserRouter>
	</ThemeProvider>,
);
