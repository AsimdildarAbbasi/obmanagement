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

export default function SupervisorLeaveApprovalPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeId, setActiveId] = useState(null);   // which card has the remarks box open
    const [remarks, setRemarks] = useState('');
    const [decidingId, setDecidingId] = useState(null); // which card is mid-submit

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (!stored) { router.push('/'); return; }
        const parsed = JSON.parse(stored);
        if (Number(parsed.role) !== 3) { router.push('/'); return; }
        setUser(parsed);
        fetchPending();
    }, []);

    async function fetchPending() {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/leaverequest/pending`);
            const text = await res.text();
            const json = text ? JSON.parse(text) : [];
            const normalized = (Array.isArray(json) ? json : []).map(l => ({
                ...l,
                leaveId: l.leaveId ?? l.LeaveId ?? l.id ?? l.Id,
                officeBoyName: l.officeBoyName ?? l.OfficeBoyName ?? 'Unknown',
                startDate: l.startDate ?? l.StartDate,
                endDate: l.endDate ?? l.EndDate,
                reason: l.reason ?? l.Reason ?? '',
                requestedAt: l.requestedAt ?? l.RequestedAt,
            }));
            setLeaves(normalized);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    function openDecision(leaveId) {
        setActiveId(activeId === leaveId ? null : leaveId);
        setRemarks('');
    }

    async function handleDecide(leaveId, approve) {
        setDecidingId(leaveId);
        try {
            const res = await fetch(`${API}/api/leaverequest/${leaveId}/decide`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supervisorAccountId: user.id,
                    approve,
                    remarks: remarks.trim() || null,
                }),
            });

            if (!res.ok) {
                const errText = await res.text();
                let msg = 'Failed to update leave request.';
                try { msg = JSON.parse(errText).message || msg; } catch { }
                alert(msg);
                return;
            }

            setActiveId(null);
            setRemarks('');
            fetchPending();
        } catch (e) {
            console.error(e);
            alert('Something went wrong. Please try again.');
        } finally {
            setDecidingId(null);
        }
    }

    if (!user) return null;

    return (
        <div className="p-8">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Leave Requests</h1>
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700">
                    {leaves.length} Pending
                </span>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-[#0C7347] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : leaves.length === 0 ? (
                <div className="bg-white rounded-2xl py-12 text-center shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-sm">No pending leave requests</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {leaves.map(leave => (
                        <div key={leave.leaveId}
                            className="bg-white rounded-2xl px-6 py-5 shadow-sm border border-gray-100">

                            {/* Office boy + status */}
                            <div className="flex items-start justify-between gap-4 mb-2">
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{leave.officeBoyName}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                                    </p>
                                </div>
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                                    Pending
                                </span>
                            </div>

                            {/* Reason */}
                            <p className="text-sm text-gray-600 mb-4">{leave.reason}</p>

                            {/* Requested at */}
                            <p className="text-xs text-gray-400 mb-4">
                                Requested {formatDate(leave.requestedAt)}
                            </p>

                            {/* Action buttons */}
                            {activeId !== leave.leaveId ? (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => openDecision(leave.leaveId)}
                                        className="px-5 py-2 rounded-xl text-white text-sm font-semibold"
                                        style={{ backgroundColor: '#0C7347' }}>
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => openDecision(leave.leaveId)}
                                        className="px-5 py-2 rounded-xl text-sm font-semibold border border-red-200 text-red-600">
                                        Decline
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3 pt-2 border-t border-gray-100">
                                    <label className="text-xs font-semibold text-gray-500">
                                        Remarks (optional)
                                    </label>
                                    <textarea
                                        value={remarks}
                                        onChange={e => setRemarks(e.target.value)}
                                        rows={3}
                                        placeholder="Add a note for the office boy..."
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[#0C7347] resize-none"
                                    />
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleDecide(leave.leaveId, true)}
                                            disabled={decidingId === leave.leaveId}
                                            className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                                            style={{ backgroundColor: '#0C7347' }}>
                                            {decidingId === leave.leaveId ? 'Submitting...' : 'Confirm Approve'}
                                        </button>
                                        <button
                                            onClick={() => handleDecide(leave.leaveId, false)}
                                            disabled={decidingId === leave.leaveId}
                                            className="px-5 py-2 rounded-xl text-sm font-semibold border border-red-200 text-red-600 disabled:opacity-60">
                                            {decidingId === leave.leaveId ? 'Submitting...' : 'Confirm Decline'}
                                        </button>
                                        <button
                                            onClick={() => setActiveId(null)}
                                            className="px-5 py-2 rounded-xl text-sm font-semibold text-gray-500">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>
                    ))}
                </div>
            )}

        </div>
    );
}