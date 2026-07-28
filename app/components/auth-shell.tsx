"use client";

// 인증 화면 공통 껍데기. 기존 정보 페이지(InfoShell)와 같은 디자인 언어를 쓰되,
// 인증에 필요한 상태(로딩·오류·안내)를 한곳에서 일관되게 다룬다.
//
// 접근성 규칙:
//  - 오류는 role="alert"로 즉시 읽히고, 입력과 aria-describedby로 연결한다.
//  - 제출 중에는 버튼을 비활성화해 중복 제출을 막는다(aria-busy로 상태도 알린다).

import Link from "next/link";
import type { ReactNode } from "react";
import BrandGlyph from "./brand-mark";

export function AuthShell({
  eyebrow,
  title,
  lead,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="auth-page">
      <header className="auth-topbar">
        <Link className="brand" href="/" aria-label="GapProof 홈">
          <span className="brand-mark"><BrandGlyph /></span>
          <span>GapProof</span>
        </Link>
      </header>
      <section className="auth-card">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="auth-lead">{lead}</p>
        {children}
      </section>
      {footer && <div className="auth-footer">{footer}</div>}
      <p className="auth-note">
        로그인은 결과를 이어서 보관하기 위한 것입니다. 로그인하지 않아도 <Link href="/demo">데모 분석</Link>은 그대로 쓸 수 있고,
        인정 범위와 증거등급은 로그인 여부와 관계없이 똑같습니다.
      </p>
    </main>
  );
}

export function AuthError({ message, id }: { message: string | null; id: string }) {
  if (!message) return null;
  return (
    <p className="auth-error" role="alert" id={id}>
      {message}
    </p>
  );
}

export function AuthNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="auth-notice" role="status">
      {message}
    </p>
  );
}

// Supabase 설정이 없을 때 가짜 로그인 화면을 보여 주지 않는다.
export function AuthUnconfigured() {
  return (
    <AuthShell
      eyebrow="Account"
      title="계정 기능이 아직 연결되지 않았습니다."
      lead="이 환경에는 인증 설정이 없어 로그인·회원가입을 진행할 수 없습니다."
    >
      <p className="auth-note">
        데모 분석은 로그인 없이 그대로 이용할 수 있습니다. <Link href="/demo">데모로 이동</Link>
      </p>
    </AuthShell>
  );
}
