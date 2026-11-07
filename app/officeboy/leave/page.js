'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = 'http://localhost:5077';

function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
}

function daysBetween(start, end) {
    if (!start || !end) return null;
    const ms = new Date(end) - new Date(start);
    return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

function StatusBadge({ status }) {
    const styles = {
        Pending: 'bg-amber-100 text-amber-700',
        Approved: 'bg-[#0C7347]/10 text-[#0C7347]',
        Rejected: 'bg-red-100 text-red-600',
    };
    const dot = {
        Pending: 'bg-amber-500',
        Approved: 'bg-[#0C7347]',
        Rejected: 'bg-red-500',
    };
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dot[status] || 'bg-gray-400'}`} />
            {status}
        </span>
    );
}

export default function LeaveManagementPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [tab, setTab] = useState('list'); // 'list' | 'apply'
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [formError, setFormError] = useState('');

    useEffect(() => {
        const stored = sessionStorage.getItem('user');
        if (!stored) { router.push('/'); return; }
        const parsed = JSON.parse(stored);
        if (parsed.role !== 1) { router.push('/'); return; }
        setUser(parsed);
        fetchLeaves(parsed.id);
    }, []);

    async function fetchLeaves(id) {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/leaverequest/officeboy/${id}`);
            const text = await res.text();
            const json = text ? JSON.parse(text) : [];
            const normalized = (Array.isArray(json) ? json : []).map(l => ({
                ...l,
                leaveId: l.leaveId ?? l.LeaveId ?? l.id ?? l.Id,
                startDate: l.startDate ?? l.StartDate,
                endDate: l.endDate ?? l.EndDate,
                reason: l.reason ?? l.Reason ?? '',
                status: l.status ?? l.Status ?? 'Pending',
                supervisorRemarks: l.supervisorRemarks ?? l.SupervisorRemarks ?? '',
                substituteOfficeBoyName: l.substituteOfficeBoyName ?? l.SubstituteOfficeBoyName ?? '',
                requestedAt: l.requestedAt ?? l.RequestedAt,
            }));
            setLeaves(normalized);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setFormError('');

        if (!startDate || !endDate || !reason.trim()) {
            setFormError('Please fill in start date, end date, and reason.');
            return;
        }
        if (new Date(endDate) < new Date(startDate)) {
            setFormError('End date cannot be before start date.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`${API}/api/leaverequest/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    officeBoyAccountId: user.id,
                    startDate,
                    endDate,
                    reason: reason.trim(),
                }),
            });

            if (!res.ok) {
                const errText = await res.text();
                let msg = 'Failed to submit leave request.';
                try { msg = JSON.parse(errText).message || msg; } catch { }
                setFormError(msg);
                return;
            }

            setStartDate('');
            setEndDate('');
            setReason('');
            setTab('list');
            fetchLeaves(user.id);
        } catch (e) {
            console.error(e);
            setFormError('Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    if (!user) return null;

    const pendingCount = leaves.filter(l => l.status === 'Pending').length;
    const approvedCount = leaves.filter(l => l.status === 'Approved').length;

    return (
        <div className="min-h-screen bg-gray-50/60 p-6 md:p-10">
            <div className="max-w-3xl mx-auto">

                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Leave Requests</h1>
                        <p className="text-sm text-gray-500 mt-1">Track and manage your time off</p>
                    </div>
                    {tab === 'list' && (
                        <button
                            onClick={() => setTab('apply')}
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm hover:shadow-md hover:opacity-95 active:scale-[0.98] transition"
                            style={{ backgroundColor: '#0C7347' }}>
                            <span className="text-base leading-none">+</span> Apply for Leave
                        </button>
                    )}
                </div>

                {/* Summary strip */}
                {tab === 'list' && !loading && leaves.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 mb-8">
                        
                        <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100">
                            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Pending</p>
                        </div>
                        <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100">
                            <p className="text-2xl font-bold" style={{ color: '#0C7347' }}>{approvedCount}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Approved</p>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setTab('list')}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${tab === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}>
                        My Leaves
                    </button>
                    <button
                        onClick={() => setTab('apply')}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${tab === 'apply' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}>
                        Apply for Leave
                    </button>
                </div>

                {/* My Leaves tab */}
                {tab === 'list' && (
                    loading ? (
                        <div className="flex items-center justify-center py-24">
                            <div className="w-8 h-8 border-4 border-[#0C7347] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : leaves.length === 0 ? (
                        <div className="bg-white rounded-2xl py-16 text-center shadow-sm border border-gray-100">
                            <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4 text-2xl">
                                🗓️
                            </div>
                            <p className="text-gray-700 text-sm font-semibold">No leave requests yet</p>
                            <p className="text-gray-400 text-xs mt-1 mb-5">When you apply for leave, it will show up here.</p>
                            <button
                                onClick={() => setTab('apply')}
                                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-white text-sm font-semibold shadow-sm hover:opacity-95 transition"
                                style={{ backgroundColor: '#0C7347' }}>
                                + Apply for Leave
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {leaves.map(leave => {
                                const nDays = daysBetween(leave.startDate, leave.endDate);
                                return (
                                    <div key={leave.leaveId}
                                        className="bg-white rounded-2xl px-6 py-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">

                                        <div className="flex items-start justify-between gap-4 mb-2.5">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">
                                                    {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                                                </p>
                                                {nDays && (
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {nDays} {nDays === 1 ? 'day' : 'days'}
                                                    </p>
                                                )}
                                            </div>
                                            <StatusBadge status={leave.status} />
                                        </div>

                                        <p className="text-sm text-gray-600 leading-relaxed mb-3">{leave.reason}</p>

                                        {(leave.substituteOfficeBoyName || leave.supervisorRemarks) && (
                                            <div className="border-t border-gray-100 pt-3 mt-1 flex flex-col gap-1.5">
                                                {leave.status === 'Approved' && leave.substituteOfficeBoyName && (
                                                    <p className="text-xs text-gray-500">
                                                        <span className="font-semibold text-gray-600">Substitute:</span> {leave.substituteOfficeBoyName}
                                                    </p>
                                                )}
                                                {leave.status !== 'Pending' && leave.supervisorRemarks && (
                                                    <p className="text-xs text-gray-500 italic">
                                                        <span className="font-semibold not-italic text-gray-600">Supervisor:</span> {leave.supervisorRemarks}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        <p className="text-[11px] text-gray-400 mt-3">
                                            Requested {formatDate(leave.requestedAt)}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}

                {/* Apply for Leave tab */}
                {tab === 'apply' && (
                    <div className="bg-white rounded-2xl px-6 py-7 md:px-8 md:py-8 shadow-sm border border-gray-100 max-w-lg">
                        <h2 className="text-lg font-bold text-gray-900 mb-1">New Leave Request</h2>
                        <p className="text-xs text-gray-500 mb-6">Fill in the details below to submit your request.</p>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Start Date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0C7347]/20 focus:border-[#0C7347] transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">End Date</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0C7347]/20 focus:border-[#0C7347] transition"
                                    />
                                </div>
                            </div>

                            {startDate && endDate && new Date(endDate) >= new Date(startDate) && (
                                <p className="text-xs text-gray-500 -mt-2">
                                    {daysBetween(startDate, endDate)} {daysBetween(startDate, endDate) === 1 ? 'day' : 'days'} requested
                                </p>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Reason</label>
                                <textarea
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    rows={4}
                                    placeholder="Why are you requesting leave?"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0C7347]/20 focus:border-[#0C7347] resize-none transition"
                                />
                            </div>

                            {formError && (
                                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>
                            )}

                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setTab('list')}
                                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm hover:opacity-95 disabled:opacity-60 transition"
                                    style={{ backgroundColor: '#0C7347' }}>
                                    {submitting ? 'Submitting...' : 'Submit Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

            </div>
        </div>
    );
}


