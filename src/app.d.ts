declare global {
	namespace App {
		interface Locals {
			isAuthenticated?: boolean;
			isRateLimited?: boolean;
		}
	}
}

export {};
