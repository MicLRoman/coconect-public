import main, admin_routes
print("backend OK routes:", len({r.path for r in main.app.routes}))
