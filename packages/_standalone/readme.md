this folder hosts so-called "standalone" packages that don't make sense to be published every time

essentially this means that they are only published on demand and not with their dependencies/dependents,
and as such *may* depend on other @fuman/* packages with a non-`workspace:` link to ensure compatibility.
