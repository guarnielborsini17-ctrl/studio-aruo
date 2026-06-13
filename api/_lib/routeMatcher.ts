type RouteShape = {
  method: string;
  path: string;
};

export function matchApiRoute(
  routes: RouteShape[],
  method: string,
  requestPath: string
): { index: number; params: Record<string, string> } | null {
  const requestSegments = requestPath.split('/').filter(Boolean);

  for (let index = 0; index < routes.length; index += 1) {
    const route = routes[index];
    if (route.method !== method) continue;

    const routeSegments = route.path.split('/').filter(Boolean);
    if (routeSegments.length !== requestSegments.length) continue;

    const params: Record<string, string> = {};
    let matched = true;

    for (let segmentIndex = 0; segmentIndex < routeSegments.length; segmentIndex += 1) {
      const expected = routeSegments[segmentIndex];
      const actual = requestSegments[segmentIndex];

      if (expected.startsWith(':')) {
        params[expected.slice(1)] = decodeURIComponent(actual);
      } else if (expected !== actual) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return { index, params };
    }
  }

  return null;
}
