import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { clearPeople, deletePerson, getPeople, importPeople, savePerson } from './db';
import { calculateNextReview, createInitialStats, findPersonByAnswer, isCorrectAnswer, makeChoices, pickNextPerson } from './quiz';
import type { Person, QuizMode } from './types';
import './style.css';

const blank = (now = new Date()): Person => ({ id: crypto.randomUUID(), firstName: '', lastName: '', displayName: '', kana: '', team: '', memo: '', aliases: [], imageDataUrl: '', createdAt: now.toISOString(), updatedAt: now.toISOString(), stats: createInitialStats(now) });
const readFile = (file: File) => new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(r.error); r.readAsDataURL(file); });
const fmt = (v: string | null) => v ? new Date(v).toLocaleString() : '-';
const rate = (p: Person) => p.stats.totalAttempts ? Math.round((p.stats.correctAttempts / p.stats.totalAttempts) * 100) : 0;

type Page = 'home' | 'form' | 'list' | 'quiz' | 'settings';

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [people, setPeople] = useState<Person[]>([]);
  const [editing, setEditing] = useState<Person | null>(null);
  const [query, setQuery] = useState('');
  const [teamQuery, setTeamQuery] = useState('');
  const [mode, setMode] = useState<QuizMode>('input');
  const [quizPerson, setQuizPerson] = useState<Person | null>(null);
  const [choices, setChoices] = useState<Person[]>([]);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const [mistakenPerson, setMistakenPerson] = useState<Person | null>(null);
  const [message, setMessage] = useState('');
  const isAdvancing = useRef(false);

  const refresh = async () => setPeople(await getPeople());
  useEffect(() => { refresh(); }, []);

  const dashboard = useMemo(() => {
    const total = people.reduce((sum, p) => sum + p.stats.totalAttempts, 0);
    const correct = people.reduce((sum, p) => sum + p.stats.correctAttempts, 0);
    return { due: people.filter((p) => new Date(p.stats.nextReviewAt) <= new Date()).length, total, accuracy: total ? Math.round(correct / total * 100) : 0, weak: [...people].sort((a, b) => (b.stats.wrongAttempts - a.stats.wrongAttempts) || (rate(a) - rate(b))).slice(0, 5) };
  }, [people]);

  const startQuiz = (nextMode = mode) => {
    if (nextMode === 'multiple' && people.length < 4) { setMessage('4択モードには4人以上の登録が必要です。'); return; }
    const next = pickNextPerson(people);
    isAdvancing.current = false;
    setMode(nextMode); setQuizPerson(next); setAnswer(''); setResult(null); setMistakenPerson(null); setMessage(next ? '' : '人物を登録してください。');
    if (next && nextMode === 'multiple') setChoices(makeChoices(next, people));
    setPage('quiz');
  };

  const submitAnswer = async (ok: boolean, mistakenFor: Person | null = null) => {
    if (!quizPerson) return;
    const updated = { ...quizPerson, stats: calculateNextReview(quizPerson.stats, ok) };
    await savePerson(updated); await refresh(); setQuizPerson(updated); setResult(ok); setMistakenPerson(ok ? null : mistakenFor);
  };

  const nextQuestion = async () => {
    if (isAdvancing.current) return;
    isAdvancing.current = true;
    await refresh();
    setTimeout(() => startQuiz(mode), 0);
  };

  useEffect(() => {
    if (page !== 'quiz' || result === null || !quizPerson) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.repeat || event.isComposing) return;
      event.preventDefault();
      void nextQuestion();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [page, result, quizPerson]);

  return <div><header><h1>Face Name Trainer</h1><nav>{['home','form','list','quiz','settings'].map((p) => <button key={p} onClick={() => p === 'quiz' ? startQuiz(mode) : (setPage(p as Page), setEditing(null))}>{({home:'ホーム',form:'人物登録',list:'人物一覧',quiz:'クイズ',settings:'設定'} as Record<string,string>)[p]}</button>)}</nav></header><main>{message && <p className="notice">{message}</p>}
    {page === 'home' && <section><h2>ダッシュボード</h2><div className="cards"><b>登録人数<br />{people.length}</b><b>今日復習<br />{dashboard.due}</b><b>総回答数<br />{dashboard.total}</b><b>正答率<br />{dashboard.accuracy}%</b></div><h3>苦手な人物</h3>{dashboard.weak.map((p) => <article className="row" key={p.id}><img src={p.imageDataUrl} /><span>{p.displayName}（誤答 {p.stats.wrongAttempts} / 正答率 {rate(p)}%）</span></article>)}</section>}
    {page === 'form' && <PersonForm person={editing ?? blank()} onCancel={() => { setEditing(null); setPage('list'); }} onSave={async (p) => { await savePerson(p); await refresh(); setEditing(null); setPage('list'); }} />}
    {page === 'list' && <section><h2>人物一覧</h2><div className="filters"><input placeholder="名前検索" value={query} onChange={(e) => setQuery(e.target.value)} /><input placeholder="所属検索" value={teamQuery} onChange={(e) => setTeamQuery(e.target.value)} /></div>{people.filter((p) => `${p.displayName}${p.firstName}${p.lastName}${p.kana}`.includes(query) && p.team.includes(teamQuery)).map((p) => <article className="person" key={p.id}><img src={p.imageDataUrl} /><div><h3>{p.displayName}</h3><p>{p.kana} / {p.team}</p><p>正答率 {rate(p)}%・最終 {fmt(p.stats.lastReviewedAt)}・次回 {fmt(p.stats.nextReviewAt)}</p><button onClick={() => { setEditing(p); setPage('form'); }}>編集</button><button className="danger" onClick={async () => confirm('削除しますか？') && (await deletePerson(p.id), await refresh())}>削除</button></div></article>)}</section>}
    {page === 'quiz' && <section className="quiz"><h2>この人の名前は？</h2><div className="mode"><button onClick={() => startQuiz('input')}>自由入力</button><button onClick={() => startQuiz('multiple')}>4択</button></div>{quizPerson && <><img className="face" src={quizPerson.imageDataUrl} />{result === null ? mode === 'input' ? <form onSubmit={(e) => { e.preventDefault(); const ok = isCorrectAnswer(answer, quizPerson); submitAnswer(ok, ok ? null : findPersonByAnswer(answer, people)); }}><input autoFocus value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="名前を入力" /><button>回答</button></form> : <div className="choices">{choices.map((c) => <button key={c.id} onClick={() => submitAnswer(c.id === quizPerson.id, c.id === quizPerson.id ? null : c)}><ruby>{c.displayName}{c.kana && <><rp>（</rp><rt>{c.kana}</rt><rp>）</rp></>}</ruby></button>)}</div> : <div className={result ? 'correct' : 'wrong'}><h3>{result ? '正解！' : '不正解'}</h3><p className="answer">正しい名前: {quizPerson.displayName}</p><p>{quizPerson.kana}</p><p>{quizPerson.team}</p><p>{quizPerson.memo}</p>{!result && mistakenPerson && <div className="mistaken-person"><p>それはこの人です</p><img src={mistakenPerson.imageDataUrl} alt={mistakenPerson.displayName} /><strong>{mistakenPerson.displayName}</strong></div>}<button onClick={nextQuestion}>次へ</button></div>}</>}</section>}
    {page === 'settings' && <Settings people={people} refresh={refresh} />}
  </main></div>;
}

function PersonForm({ person, onSave, onCancel }: { person: Person; onSave: (p: Person) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(person);
  const update = (key: keyof Person, value: string | string[]) => setDraft((p) => ({ ...p, [key]: value, updatedAt: new Date().toISOString() }));
  const submit = (e: FormEvent) => { e.preventDefault(); onSave({ ...draft, displayName: draft.displayName || `${draft.lastName} ${draft.firstName}`.trim() }); };
  return <section><h2>人物登録・編集</h2><form className="form" onSubmit={submit}><label>顔写真<input type="file" accept="image/*" onChange={async (e) => e.target.files?.[0] && update('imageDataUrl', await readFile(e.target.files[0]))} /></label>{draft.imageDataUrl && <img className="preview" src={draft.imageDataUrl} />} {(['lastName','firstName','displayName','kana','team'] as const).map((k) => <label key={k}>{({lastName:'姓',firstName:'名',displayName:'表示名',kana:'ふりがな',team:'所属・チーム'} as Record<string,string>)[k]}<input value={draft[k]} onChange={(e) => update(k, e.target.value)} /></label>)}<label>メモ<textarea value={draft.memo} onChange={(e) => update('memo', e.target.value)} /></label><label>別名・許容回答（1行1件）<textarea value={draft.aliases.join('\n')} onChange={(e) => update('aliases', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} /></label><button disabled={!draft.imageDataUrl}>保存</button><button type="button" onClick={onCancel}>キャンセル</button></form></section>;
}

function Settings({ people, refresh }: { people: Person[]; refresh: () => Promise<void> }) {
  const exportJson = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), people }, null, 2)], { type: 'application/json' })); a.download = 'face-name-trainer-export.json'; a.click(); URL.revokeObjectURL(a.href); };
  const importJson = async (file: File) => { const text = await file.text(); const data = JSON.parse(text); await importPeople(Array.isArray(data) ? data : data.people); await refresh(); alert('インポートしました'); };
  return <section><h2>設定 / データ管理</h2><p>データはIndexedDBに保存され、外部APIやサーバーへ送信しません。</p><button onClick={exportJson}>JSONエクスポート</button><label className="import">JSONインポート<input type="file" accept="application/json" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} /></label><button className="danger" onClick={async () => confirm('全データを削除しますか？') && (await clearPeople(), await refresh())}>全削除</button></section>;
}
