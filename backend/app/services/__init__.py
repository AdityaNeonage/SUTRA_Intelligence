"""Business services shared by HTTP routes and future background workflows."""

# Keep this package initializer light: authentication and case services must be
# usable even in an environment that has not yet installed optional analytics
# dependencies. Import concrete services from their modules.
