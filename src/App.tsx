import { Route, Switch } from 'wouter';
import Landing from './routes/Landing';
import Swipe from './routes/Swipe';
import Result from './routes/Result';
import Shared from './routes/Shared';

/**
 * Path-based routing needs an SPA fallback so /s/<seed> resolves on a static
 * host — see vercel.json. If you ever want to drop that requirement entirely,
 * wouter's location source is swappable in one line:
 *
 *   import { useHashLocation } from 'wouter/use-hash-location';
 *   <Router hook={useHashLocation}> ... </Router>
 */
export default function App() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/swipe" component={Swipe} />
      <Route path="/result" component={Result} />
      <Route path="/s/:seed" component={Shared} />
      <Route>
        <main className="mx-auto max-w-lg px-6 py-24 text-center">
          <h1 className="text-2xl font-bold text-zinc-100">Not found</h1>
          <a href="/" className="mt-6 inline-block text-zinc-400 underline hover:text-zinc-100">
            Go home
          </a>
        </main>
      </Route>
    </Switch>
  );
}
