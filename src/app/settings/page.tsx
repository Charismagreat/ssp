'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save, Plus, Trash2, Calendar } from 'lucide-react';
import Link from 'next/link';

interface CardSetting {
    id: string;
    name: string;
    amount: string;
}

interface MonthlyUsage {
    id: string;
    yearMonth: string; // e.g. "2024.02"
    amount: string;
}

/**
 * 설정 페이지
 * 1. 카드별 기본 설정
 * 2. 연도 및 월별 카드 사용액 설정 (대시보드 기초 데이터)
 */
export default function SettingsPage() {
    const router = useRouter();
    const [cards, setCards] = useState<CardSetting[] | null>(null);
    const [monthlyUsage, setMonthlyUsage] = useState<MonthlyUsage[] | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // 기존 카드 설정 로드
        const savedCards = localStorage.getItem('cardSettings');
        if (savedCards) {
            setCards(JSON.parse(savedCards));
        } else {
            setCards([{ id: '1', name: '', amount: '' }]);
        }

        // 월별 신규 사용액 데이터 로드
        const savedMonthly = localStorage.getItem('monthlyUsageData');
        if (savedMonthly) {
            setMonthlyUsage(JSON.parse(savedMonthly));
        } else {
            // 기본값: 최근 13개월 정도 미리 생성
            const initial: MonthlyUsage[] = [];
            const now = new Date();
            for (let i = 0; i < 14; i++) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const ym = `${String(d.getFullYear()).slice(-2)}.${String(d.getMonth() + 1).padStart(2, '0')}`;
                initial.push({ id: `m-${i}`, yearMonth: ym, amount: '' });
            }
            setMonthlyUsage(initial);
        }
    }, []);

    const handleAddCard = () => {
        if (!cards) return;
        setCards([...cards, { id: Date.now().toString(), name: '', amount: '' }]);
    };

    const handleRemoveCard = (id: string) => {
        if (!cards || cards.length <= 1) return;
        setCards(cards.filter(card => card.id !== id));
    };

    const handleCardChange = (id: string, field: 'name' | 'amount', value: string) => {
        if (!cards) return;
        setCards(cards.map(card =>
            card.id === id ? { ...card, [field]: value } : card
        ));
    };

    const handleMonthlyChange = (id: string, field: 'yearMonth' | 'amount', value: string) => {
        if (!monthlyUsage) return;
        setMonthlyUsage(monthlyUsage.map(m =>
            m.id === id ? { ...m, [field]: value } : m
        ));
    };

    const handleAddMonthly = () => {
        if (!monthlyUsage) return;
        setMonthlyUsage([{ id: Date.now().toString(), yearMonth: '', amount: '' }, ...monthlyUsage]);
    };

    const handleRemoveMonthly = (id: string) => {
        if (!monthlyUsage) return;
        setMonthlyUsage(monthlyUsage.filter(m => m.id !== id));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!cards || !monthlyUsage) return;
        setIsSaving(true);

        localStorage.setItem('cardSettings', JSON.stringify(cards));
        localStorage.setItem('monthlyUsageData', JSON.stringify(monthlyUsage));

        setTimeout(() => {
            setIsSaving(false);
            router.push('/');
        }, 500);
    };

    if (!cards || !monthlyUsage) {
        return (
            <main className="dashboard-container">
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10rem', color: 'var(--text-muted)' }}>
                    Loading Settings...
                </div>
            </main>
        );
    }

    return (
        <main className="dashboard-container">
            <header className="header" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link href="/" className="icon-button">
                        <ChevronLeft size={20} />
                    </Link>
                    <h1>설정</h1>
                </div>
            </header>

            <div className="settings-container" style={{ maxWidth: '800px' }}>
                <form onSubmit={handleSave}>
                    {/* 카드별 기본 설정 섹션 */}
                    <div className="settings-section-title">
                        <span>카드별 기본 설정</span>
                        <button type="button" className="btn-outline" onClick={handleAddCard} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '13px' }}>
                            <Plus size={14} /> 카드 추가
                        </button>
                    </div>

                    <div style={{ marginBottom: '3rem' }}>
                        {cards.map((card) => (
                            <div key={card.id} className="card-setting-item">
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="카드명"
                                    value={card.name}
                                    onChange={(e) => handleCardChange(card.id, 'name', e.target.value)}
                                    required
                                />
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="설정액"
                                    value={card.amount}
                                    onChange={(e) => handleCardChange(card.id, 'amount', e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="btn-danger"
                                    onClick={() => handleRemoveCard(card.id)}
                                    disabled={cards.length === 1}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* 연도/월별 사용액 설정 섹션 */}
                    <div className="settings-section-title">
                        <span>연도 및 월별 카드 사용액 설정 (대시보드 데이터)</span>
                        <button type="button" className="btn-outline" onClick={handleAddMonthly} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '13px' }}>
                            <Plus size={14} /> 직접 추가
                        </button>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '1rem' }}>
                        ※ 대시보드 차트와 전년 동월 대비 비교의 기초 데이터로 활용됩니다. (형식: YY.MM)
                    </p>

                    <div style={{ marginBottom: '3rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                        {monthlyUsage.map((m) => (
                            <div key={m.id} className="card" style={{ padding: '1rem', border: '1px solid var(--card-border)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <Calendar size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                <div style={{ display: 'flex', flex: 1, gap: '0.5rem', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        style={{ width: '65px', textAlign: 'center', padding: '8px 4px' }}
                                        placeholder="YY.MM"
                                        value={m.yearMonth}
                                        onChange={(e) => handleMonthlyChange(m.id, 'yearMonth', e.target.value)}
                                        required
                                    />
                                    <input
                                        type="number"
                                        className="form-input"
                                        style={{ flex: 1, fontSize: '1rem', padding: '8px 12px', fontWeight: 500 }}
                                        placeholder="금액 입력"
                                        value={m.amount}
                                        onChange={(e) => handleMonthlyChange(m.id, 'amount', e.target.value)}
                                        required
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="btn-danger"
                                    style={{ padding: '8px', background: 'rgba(255, 68, 68, 0.1)', border: 'none' }}
                                    onClick={() => handleRemoveMonthly(m.id)}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button type="submit" className="btn-primary" disabled={isSaving} style={{ width: '100%', padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600 }}>
                            <Save size={20} />
                            {isSaving ? '저장 중...' : '모든 설정 저장 및 적용'}
                        </div>
                    </button>
                </form>
            </div>

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <Link href="/" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'underline' }}>
                    대시보드로 돌아가기
                </Link>
            </div>
        </main>
    );
}
