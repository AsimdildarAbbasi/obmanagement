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

function StatusBadge({ status }) {
    const styles = {
        Pending: 'bg-amber-100 text-amber-700',
        Approved: 'bg-[#0C7347]/10 text-[#0C7347]',
        Rejected: 'bg-red-100 text-red-600',
    };
    return (
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
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
        const stored = localStorage.getItem('user');
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

    return (
        <div className="p-8">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Leave Requests</h1>
                {tab === 'list' && (
                    <button
                        onClick={() => setTab('apply')}
                        className="px-5 py-2 rounded-xl text-white text-sm font-semibold"
                        style={{ backgroundColor: '#0C7347' }}>
                        + Apply
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setTab('list')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${tab === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                        }`}>
                    My Leaves
                </button>
                <button
                    onClick={() => setTab('apply')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${tab === 'apply' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
                        }`}>
                    Apply for Leave
                </button>
            </div>

            {/* My Leaves tab */}
            {tab === 'list' && (
                loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-[#0C7347] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : leaves.length === 0 ? (
                    <div className="bg-white rounded-2xl py-12 text-center shadow-sm border border-gray-100">
                        <p className="text-gray-400 text-sm">No leave requests yet</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {leaves.map(leave => (
                            <div key={leave.leaveId}
                                className="bg-white rounded-2xl px-6 py-5 shadow-sm border border-gray-100">

                                <div className="flex items-start justify-between gap-4 mb-2">
                                    <p className="text-sm font-bold text-gray-800">
                                        {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                                    </p>
                                    <StatusBadge status={leave.status} />
                                </div>

                                <p className="text-sm text-gray-600 mb-2">{leave.reason}</p>

                                {leave.status !== 'Pending' && leave.supervisorRemarks && (
                                    <p className="text-xs text-gray-400 italic">
                                        Supervisor: {leave.supervisorRemarks}
                                    </p>
                                )}

                                <p className="text-xs text-gray-400 mt-2">
                                    Requested {formatDate(leave.requestedAt)}
                                </p>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* Apply for Leave tab */}
            {tab === 'apply' && (
                <div className="bg-white rounded-2xl px-6 py-6 shadow-sm border border-gray-100 max-w-md">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[#0C7347]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[#0C7347]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Reason</label>
                            <textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                rows={4}
                                placeholder="Why are you requesting leave?"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[#0C7347] resize-none"
                            />
                        </div>

                        {formError && (
                            <p className="text-xs text-red-500">{formError}</p>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                            style={{ backgroundColor: '#0C7347' }}>
                            {submitting ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </form>
                </div>
            )}

        </div>
    );
}