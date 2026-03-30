import { Link, NavLink, Route, Routes } from "react-router-dom";
import CreateInteraction from "./pages/CreateInteraction";
import InteractionLog from "./pages/InteractionLog"
import InteractionDetail from "./pages/InteractionDetail"
import VaultBar from "./components/VaultBar"
import IssueDetail from "./pages/IssueDetail"
import IssueLog from "./pages/IssueLog"

function NavItem(props: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={props.to}
      className={({ isActive }) =>
        [
          "rounded-md px-3 py-1 text-sm",
          isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100",
        ].join(" ")
      }
    >
      {props.children}
    </NavLink>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-3xl items-center justify-between p-4">
          <Link to="/" className="text-base font-semibold">
            Verity
          </Link>

          <nav className="flex items-center gap-2">
            <NavItem to="/">Log</NavItem>
            <NavItem to="/interactions/new">New</NavItem>
            <NavItem to="/issues">Issues</NavItem>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl p-4">
        <VaultBar/>
        <Routes>
          <Route
            path="/"
            element={<InteractionLog/>}
             
          />
          <Route path="/interactions/:id" element={<InteractionDetail/>}/>
          <Route path="/issues" element={<IssueLog />} />
          <Route path="/issues/:id" element={<IssueDetail />} />
          <Route path="/interactions/new" element={<CreateInteraction />} />

          <Route
            path="*"
            element={
              <div className="rounded-xl border border-slate-200 p-6">
                <div className="text-lg font-semibold">404</div>
                <p className="mt-1 text-sm text-slate-600">
                  That page doesn’t exist.
                </p>
                <div className="mt-4">
                  <Link className="underline" to="/">
                    Go home
                  </Link>
                </div>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}