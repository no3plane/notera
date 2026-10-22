import type { ReactNode } from 'react';

export function PracticeModeToolbar({
  children,
  description,
}: {
  children: ReactNode;
  description: string;
}) {
  return (
    <>
      <div className="mode-toolbar">
        {children}
        <p>切换题型会开始新一轮，已答题目保留记录。</p>
      </div>
      <p className="mode-description">{description}</p>
    </>
  );
}
