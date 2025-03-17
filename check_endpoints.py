# server/check_endpoints.py
import uvicorn
from fastapi import FastAPI
from fastapi.routing import APIRoute

# Import your app
from main import app

def check_all_routes():
    """Print all registered routes in the app."""
    print("Checking all registered routes in the FastAPI application:")
    print("-" * 60)
    
    routes = []
    
    for route in app.routes:
        if isinstance(route, APIRoute):
            routes.append({
                "path": route.path,
                "name": route.name,
                "methods": route.methods
            })
    
    # Sort routes by path for easier reading
    sorted_routes = sorted(routes, key=lambda x: x["path"])
    
    for route in sorted_routes:
        methods = ", ".join(sorted(route["methods"]))
        print(f"{methods:10} {route['path']:<40} {route['name']}")
    
    print("-" * 60)
    print(f"Total routes: {len(routes)}")
    
    # Check specifically for our vocabulary routes
    vocabulary_routes = [r for r in routes if "vocabulary" in r["path"]]
    
    if vocabulary_routes:
        print("\nVocabulary routes found:")
        for route in vocabulary_routes:
            methods = ", ".join(sorted(route["methods"]))
            print(f"{methods:10} {route['path']:<40} {route['name']}")
    else:
        print("\nWARNING: No vocabulary routes found!")
        print("Make sure the routes are properly defined and included in the main app.")

if __name__ == "__main__":
    check_all_routes()
