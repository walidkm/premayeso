"use client";

import { useState } from "react";
import { ContentSidebar, type Selection } from "./ContentSidebar";
import { ContentEditor } from "./ContentEditor";

type Props = {
  token: string;
  role: string;
};

export function ContentPageClient({ token, role }: Props) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleSaved() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white px-3 py-4">
        <ContentSidebar
          key={refreshKey}
          token={token}
          role={role}
          selection={selection}
          onSelect={setSelection}
        />
      </aside>

      {/* Editor pane */}
      <main className="flex-1 overflow-y-auto px-8 py-6">
        <ContentEditor
          token={token}
          role={role}
          selection={selection}
          onSaved={handleSaved}
        />
      </main>
    </div>
  );
}
