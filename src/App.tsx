import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
      <h1 className="text-3xl font-bold text-center mb-8">
        Welcome to Tauri + React
      </h1>

      <div className="flex gap-6 mb-6">
        <a
          href="https://vite.dev"
          target="_blank"
          rel="noreferrer"
          className="transition-opacity hover:opacity-80"
        >
          <img
            src="/vite.svg"
            className="h-24 p-6 transition-all duration-700 hover:drop-shadow-[0_0_2em_#747bff]"
            alt="Vite logo"
          />
        </a>
        <a
          href="https://tauri.app"
          target="_blank"
          rel="noreferrer"
          className="transition-opacity hover:opacity-80"
        >
          <img
            src="/tauri.svg"
            className="h-24 p-6 transition-all duration-700 hover:drop-shadow-[0_0_2em_#24c8db]"
            alt="Tauri logo"
          />
        </a>
        <a
          href="https://react.dev"
          target="_blank"
          rel="noreferrer"
          className="transition-opacity hover:opacity-80"
        >
          <img
            src={reactLogo}
            className="h-24 p-6 transition-all duration-700 hover:drop-shadow-[0_0_2em_#61dafb]"
            alt="React logo"
          />
        </a>
      </div>
      <p className="text-muted-foreground mb-8">
        Click on the Tauri, Vite, and React logos to learn more.
      </p>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          className="rounded-lg border border-input bg-transparent px-5 py-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Greet
        </button>
      </form>
      {greetMsg && (
        <p className="mt-4 text-center text-muted-foreground">{greetMsg}</p>
      )}
    </main>
  );
}

export default App;
