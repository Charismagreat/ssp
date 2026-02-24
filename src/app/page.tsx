'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Settings, ChevronDown } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface CardSetting {
  id: string;
  name: string;
  amount: string;
}

interface MonthlyUsage {
  id: string;
  yearMonth: string;
  amount: string;
}

interface Transaction {
  id: number;
  cardCompany: string;
  date: string;
  amount: string;
  merchant: string;
  remarks: string;
}

/**
 * 법인카드 사용현황 대시보드
 * 설정 페이지의 연도/월별 데이터를 기반으로 통계 및 차트 동적 렌더링
 */
export default function DashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [totalPrevAmount, setTotalPrevAmount] = useState('₩0');
  const [visibleCount, setVisibleCount] = useState(10);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [stats, setStats] = useState<any[]>([]);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);

  // 자동 스크롤 시작
  const startScroll = (direction: 'left' | 'right') => {
    if (scrollIntervalRef.current) return;
    const scroll = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollLeft += direction === 'right' ? 10 : -10;
      }
      scrollIntervalRef.current = requestAnimationFrame(scroll);
    };
    scrollIntervalRef.current = requestAnimationFrame(scroll);
  };

  // 자동 스크롤 중지
  const stopScroll = () => {
    if (scrollIntervalRef.current) {
      cancelAnimationFrame(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  // 스크롤 상태 체크 (화살표 표시 여부)
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 5);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  // 초기 로드 및 데이터 변경 시 맨 오른쪽으로 스크롤
  useEffect(() => {
    if (isMounted && chartData.length > 0) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
          checkScroll();
        }
      }, 100);
    }
  }, [isMounted, chartData]);

  // 최근 7일 데이터 필터링 로직
  const getWeekTransactions = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    return allTransactions.filter((t: Transaction) => {
      const dateStr = t.date.replace(/\./g, '-');
      const d = new Date(dateStr);
      return d >= sevenDaysAgo;
    });
  };

  const weekTransactions = getWeekTransactions();
  // 최근 7일 데이터가 부족하더라도 전체 데이터에서 최근 항목을 보여주어 '더보기' 기능을 유지합니다.
  const visibleTransactions = allTransactions.slice(0, visibleCount);

  // 데이터 페칭 및 가공
  const fetchData = async () => {
    try {
      const res = await fetch('/api/transactions');
      if (!res.ok) throw new Error('Data fetch failed');
      const data: Transaction[] = await res.json();
      const sortedData = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAllTransactions(sortedData);

      // 조회 시점 기록
      const now = new Date();
      const timeStr = `${now.getFullYear()}년 ${String(now.getMonth() + 1).padStart(2, '0')}월 ${String(now.getDate()).padStart(2, '0')}일 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      setLastUpdated(timeStr);

      // 실시간 데이터 기반 통계 계산
      calculateRealStats(sortedData);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    }
  };

  const calculateRealStats = (transactions: Transaction[]) => {
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    const prevMonthDate = new Date(curYear, curMonth - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();

    const parseAmt = (s: string) => Number(s.replace(/[^0-9.-]+/g, '')) || 0;

    // 이번 달 합계
    const curMonthTotal = transactions
      .filter(t => {
        // "2026.02.17 12:39:47" 형식을 "2026-02-17 12:39:47"로 변환하여 인식률 제고
        const dateStr = t.date.replace(/\./g, '-');
        const d = new Date(dateStr);
        return d.getMonth() === curMonth && d.getFullYear() === curYear;
      })
      .reduce((acc, t) => acc + parseAmt(t.amount), 0);

    // 지난 달 합계
    const prevMonthTotal = transactions
      .filter(t => {
        const dateStr = t.date.replace(/\./g, '-');
        const d = new Date(dateStr);
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
      })
      .reduce((acc, t) => acc + parseAmt(t.amount), 0);

    // 올해 합계 (조회 시점 해당 연도 전체)
    const curYearTotal = transactions
      .filter(t => {
        const dateStr = t.date.replace(/\./g, '-');
        const d = new Date(dateStr);
        return d.getFullYear() === curYear;
      })
      .reduce((acc, t) => acc + parseAmt(t.amount), 0);

    // 설정 데이터 로드 (전년 동월 및 예산 비교용)
    const savedMonthly = localStorage.getItem('monthlyUsageData');
    const savedCards = localStorage.getItem('cardSettings');
    let monthlyRecords: MonthlyUsage[] = savedMonthly ? JSON.parse(savedMonthly) : [];

    // 1. 실시간 거래 데이터 월별 집계 (2026년 이후 데이터 포함)
    const realMonthlyMap = transactions.reduce((acc: any, t) => {
      const dateStr = t.date.replace(/\./g, '-');
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return acc;

      const ym = `${String(d.getFullYear()).slice(-2)}.${String(d.getMonth() + 1).padStart(2, '0')}`;
      const amt = parseAmt(t.amount);
      acc[ym] = (acc[ym] || 0) + amt;
      return acc;
    }, {});

    // 2. 설정 데이터와 실시간 데이터 병합
    const allMonthsSet = new Set([
      ...monthlyRecords.map(m => m.yearMonth),
      ...Object.keys(realMonthlyMap)
    ]);

    const combinedChartData = Array.from(allMonthsSet)
      .map(ym => {
        // 2026.01 이후이거나 실시간 데이터가 있는 경우 실시간 데이터 우선, 아니면 설정 데이터
        const [year] = ym.split('.').map(Number);
        const is2026OrLater = year >= 26;
        const realAmt = realMonthlyMap[ym] || 0;
        const manualData = monthlyRecords.find(m => m.yearMonth === ym);
        const manualAmt = manualData ? Number(manualData.amount) : 0;

        return {
          month: ym,
          amount: (is2026OrLater && realAmt > 0) ? realAmt : (realAmt > 0 ? realAmt : manualAmt)
        };
      })
      .sort((a, b) => {
        const [aY, aM] = a.month.split('.').map(Number);
        const [bY, bM] = b.month.split('.').map(Number);
        return (aY * 12 + aM) - (bY * 12 + bM);
      });

    setChartData(combinedChartData);

    // 전년 동월 데이터 찾기
    const curYMShort = `${String(curYear).slice(-2)}.${String(curMonth + 1).padStart(2, '0')}`;
    const prevYearYM = `${String(curYear - 1).slice(-2)}.${String(curMonth + 1).padStart(2, '0')}`;
    const prevYearData = monthlyRecords.find(d => d.yearMonth === prevYearYM);
    const prevYearAmount = prevYearData ? Number(prevYearData.amount) : 0;

    const yoyDiff = curMonthTotal - prevYearAmount;
    const yoyPerc = prevYearAmount !== 0 ? (yoyDiff / prevYearAmount) * 100 : 0;

    const momDiff = curMonthTotal - prevMonthTotal;
    const momPerc = prevMonthTotal !== 0 ? (momDiff / prevMonthTotal) * 100 : 0;

    let totalBudget = 50000000;
    if (savedCards) {
      const cards: CardSetting[] = JSON.parse(savedCards);
      totalBudget = cards.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
      setTotalPrevAmount(`₩${totalBudget.toLocaleString()}`);
    }
    // 예산 사용율: 올해 총 사용액 / 연간 총 예산
    const budgetUsagePerc = totalBudget !== 0 ? (curYearTotal / totalBudget) * 100 : 0;

    setStats([
      {
        title: '이번 달 사용 금액',
        value: `₩${curMonthTotal.toLocaleString()}`,
        trend: `전년 동월 대비 ${yoyDiff >= 0 ? '↑' : '↓'} ${Math.abs(yoyPerc).toFixed(1)}%`,
        isUp: yoyDiff >= 0
      },
      {
        title: '지난 달 대비',
        value: `${momDiff >= 0 ? '+' : '-'}₩${Math.abs(momDiff).toLocaleString()}`,
        trend: `전월 대비 ${momDiff >= 0 ? '↑' : '↓'} ${Math.abs(momPerc).toFixed(1)}%`,
        isUp: momDiff >= 0
      },
      {
        title: '올해 사용 금액',
        value: `₩${curYearTotal.toLocaleString()}`,
        trend: `예산 사용율 ${budgetUsagePerc.toFixed(1)}%`,
        isUp: true
      },
      {
        title: '전년 동월 대비',
        value: `${yoyDiff >= 0 ? '+' : '-'}₩${Math.abs(yoyDiff).toLocaleString()}`,
        trend: `${yoyDiff >= 0 ? '↑' : '↓'} ${Math.abs(yoyPerc).toFixed(1)}%`,
        isUp: yoyDiff >= 0
      },
    ]);
  };

  useEffect(() => {
    setIsMounted(true);
    fetchData();
    const interval = setInterval(fetchData, 3600000);
    return () => clearInterval(interval);
  }, []);

  const handleLoadMore = () => {
    setVisibleCount(prev => Math.min(prev + 20, allTransactions.length));
  };

  // 차트 데이터의 최댓값 기반으로 동적 눈금 계산
  const maxAmount = chartData.length > 0 ? Math.max(...chartData.map(d => Number(d.amount) || 0)) : 0;
  const chartUpperBound = Math.ceil((maxAmount || 4000000) / 2000000) * 2000000 + 2000000;
  const dynamicTicks = [];
  for (let i = chartUpperBound; i >= 0; i -= 2000000) {
    dynamicTicks.push(i);
  }

  return (
    <main className="dashboard-container">
      <header className="header">
        <div>
          <h1>법인카드 사용현황</h1>
        </div>
        <div className="header-actions">
          {isMounted && lastUpdated && (
            <div style={{ fontSize: '0.815rem', color: 'var(--text-muted)', marginRight: '1rem', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '1rem' }}>
              조회일시: {lastUpdated}
            </div>
          )}
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>관리자 님</span>
          <Link href="/settings" className="icon-button" title="설정">
            <Settings size={20} />
          </Link>
        </div>
      </header>

      <section className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="card">
            <h3>{stat.title}</h3>
            <div className="value">{stat.value}</div>
            <div className={`trend ${stat.isUp ? 'up' : 'down'}`}>
              {stat.trend}
            </div>
          </div>
        ))}
      </section>

      <section style={{ marginBottom: '80px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 600 }}>월별 카드사용액 추이</h2>
        <div style={{
          position: 'relative',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '12px',
          border: '1px solid var(--card-border)',
          overflow: 'hidden'
        }}>
          {/* 전체 컨테이너 패딩: 하단 80% 축소 반영 (20px -> 4px) */}
          {/* 전체 컨테이너 패딩: 하단 80% 축소 반영 (20px -> 4px), B영역 제거로 인한 상단 간격 조정 */}
          <div style={{ display: 'flex', padding: '10px 0 4px 0' }}>

            {/* 고정 세로축 영역 (텍스트 직접 렌더링으로 가독성 및 노출 보장) */}
            <div style={{
              width: '80px',
              height: '300px',
              flexShrink: 0,
              backgroundColor: '#0a0a0a',
              borderRight: '1px solid rgba(255,255,255,0.1)',
              zIndex: 100, // 다른 어떤 요소보다 위에 오도록 설정
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              color: '#ffffff'
            }}>
              {/* 상단 단위 표시 */}
              <div style={{
                position: 'absolute',
                left: '8px',
                top: '50%',
                transform: 'translateY(-50%) rotate(-90deg)',
                fontSize: '11px',
                color: 'rgba(255,255,255,0.5)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                zIndex: 110
              }}>
                (백만원)
              </div>

              {/* 눈금 숫자 레이어 (자동 계산된 범위 적용) */}
              {dynamicTicks.map((valValue, idx) => {
                const val = valValue / 1000000; // 백만원 단위
                // 차트 높이와 마진(top 20, bottom 8)에 맞춘 위치 계산
                const topPos = 20 + ((chartUpperBound - valValue) / chartUpperBound) * (300 - 20 - 45);
                return (
                  <div key={valValue} style={{
                    position: 'absolute',
                    top: `${topPos}px`,
                    right: '12px',
                    transform: 'translateY(-50%)',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: 'rgba(255,255,255,0.5)',
                    textAlign: 'right',
                    textShadow: '0 0 4px rgba(0,0,0,0.5)'
                  }}>
                    {val === 0 ? '0' : val.toLocaleString()}
                  </div>
                );
              })}
            </div>

            {/* 메인 스크롤 차트 영역 */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

              {/* 왼쪽 스크롤 호버 버튼 */}
              <div
                onMouseEnter={() => startScroll('left')}
                onMouseLeave={() => stopScroll()}
                style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: '40px', zIndex: 10,
                  background: 'linear-gradient(to right, rgba(0,0,0,0.5), transparent)',
                  cursor: 'pointer', display: showLeftArrow ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity 0.3s'
                }}
                onMouseMove={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                <div style={{ color: '#fff', fontSize: '20px' }}>&lt;</div>
              </div>

              <div
                className="chart-scroll-wrapper"
                ref={scrollRef}
                onScroll={checkScroll}
                style={{
                  width: '100%',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                <style dangerouslySetInnerHTML={{ __html: `.chart-scroll-wrapper::-webkit-scrollbar { display: none; }` }} />
                <div style={{
                  minWidth: chartData.length > 13 ? `${(chartData.length / 13) * 100}%` : '100%',
                  height: '300px'
                }}>
                  {isMounted && chartData.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                        />
                        <YAxis hide domain={[0, chartUpperBound]} />
                        <Tooltip
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          contentStyle={{
                            backgroundColor: 'rgba(20, 20, 20, 0.95)',
                            border: '1px solid var(--card-border)',
                            borderRadius: '8px',
                            backdropFilter: 'blur(10px)',
                            fontSize: '12px'
                          }}
                          itemStyle={{ color: '#fff' }}
                          labelStyle={{ color: '#fff', fontWeight: 600 }}
                          formatter={(value: any) => [`₩${Number(value).toLocaleString()}`, '사용 금액']}
                        />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                          {chartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? 'var(--primary)' : 'rgba(79, 70, 229, 0.2)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* 오른쪽 스크롤 호버 버튼 */}
              <div
                onMouseEnter={() => startScroll('right')}
                onMouseLeave={() => stopScroll()}
                style={{
                  position: 'absolute', right: 0, top: 0, bottom: 0, width: '40px', zIndex: 10,
                  background: 'linear-gradient(to left, rgba(0,0,0,0.5), transparent)',
                  cursor: 'pointer', display: showRightArrow ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity 0.3s'
                }}
                onMouseMove={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                <div style={{ color: '#fff', fontSize: '20px' }}>&gt;</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 600 }}>최근 승인내역</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>카드사명</th>
                <th>날짜</th>
                <th>금액</th>
                <th>가맹점명</th>
                <th>적요</th>
              </tr>
            </thead>
            <tbody>
              {visibleTransactions.map((tx, idx) => (
                <tr key={`${tx.id}-${idx}`}>
                  <td style={{ fontWeight: 500 }}>{tx.cardCompany}</td>
                  <td>{tx.date}</td>
                  <td style={{ fontWeight: 600 }}>{tx.amount}</td>
                  <td>{tx.merchant}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{tx.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {visibleCount < allTransactions.length && (
          <div className="load-more-container">
            <button className="btn-secondary" onClick={handleLoadMore}>
              더보기 <ChevronDown size={18} style={{ marginLeft: '4px' }} />
            </button>
          </div>
        )}
      </section>

      <footer style={{ marginTop: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', paddingBottom: '2rem' }}>
        &copy; 2024 Financial Operations. Built with Next.js.
      </footer>
    </main>
  );
}
