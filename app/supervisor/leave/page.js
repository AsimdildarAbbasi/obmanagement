'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '../../lib/api';
import UserAvatar from '../../components/UserAvatar';

function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
}

function toInputDate(d) {
    if (!d) return '';
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
        return d.slice(0, 10);
    }
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${dt.getFullYear()}-${month}-${day}`;
}

export default function SupervisorLeaveApprovalPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeId, setActiveId] = useState(null);   // which card has the decision box open
    const [remarks, setRemarks] = useState('');
    const [decidingId, setDecidingId] = useState(null); // which card is mid-submit
    const [freeOfficeBoys, setFreeOfficeBoys] = useState([]);
    const [freeOfficeBoysLoading, setFreeOfficeBoysLoading] = useState(false);
    const [freeOfficeBoysLoaded, setFreeOfficeBoysLoaded] = useState(false);
    const [freeOfficeBoysError, setFreeOfficeBoysError] = useState('');
    const [substituteOfficeBoyAccountId, setSubstituteOfficeBoyAccountId] = useState('');
    const [approvedStartDate, setApprovedStartDate] = useState('');
    const [approvedEndDate, setApprovedEndDate] = useState('');

    // Policy editor
    const [policy, setPolicy] = useState(null);
    const [policyYearly, setPolicyYearly] = useState('');
    const [policyMonthly, setPolicyMonthly] = useState('');
    const [policySaving, setPolicySaving] = useState(false);
    const [policyError, setPolicyError] = useState('');
    const [policySuccess, setPolicySuccess] = useState('');

    useEffect(() => {
        const stored = sessionStorage.getItem('user');
        if (!stored) { router.push('/'); return; }
        const parsed = JSON.parse(stored);
        if (Number(parsed.role) !== 3) { router.push('/'); return; }
        setUser(parsed);
        fetchPending();
        fetchPolicy();
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
                officeBoyId: l.officeBoyId ?? l.OfficeBoyId,
                officeBoyName: l.officeBoyName ?? l.OfficeBoyName ?? 'Unknown',
                officeBoyImageUrl: l.officeBoyImageUrl ?? l.OfficeBoyImageUrl ?? null,
                startDate: l.startDate ?? l.StartDate,
                endDate: l.endDate ?? l.EndDate,
                reason: l.reason ?? l.Reason ?? '',
                requestedAt: l.requestedAt ?? l.RequestedAt,
                hasActiveAssignment: l.hasActiveAssignment ?? l.HasActiveAssignment ?? false,
                assignedFloors: l.assignedFloors ?? l.AssignedFloors ?? [],
            }));
            setLeaves(normalized);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function fetchPolicy() {
        try {
            const res = await fetch(`${API}/api/leaverequest/policy`);
            if (!res.ok) return;
            const json = await res.json();
            setPolicy(json);
            setPolicyYearly(String(json.yearlyLimit ?? ''));
            setPolicyMonthly(String(json.monthlyLimit ?? ''));
        } catch (e) {
            console.error(e);
        }
    }

    async function savePolicy() {
        setPolicyError('');
        setPolicySuccess('');

        const yearly = Number(policyYearly);
        const monthly = Number(policyMonthly);

        if (!yearly || !monthly || yearly <= 0 || monthly <= 0) {
            setPolicyError('Limits must be greater than zero.');
            return;
        }
        if (monthly > yearly) {
            setPolicyError('Monthly limit cannot exceed the yearly limit.');
            return;
        }

        setPolicySaving(true);
        try {
            const res = await fetch(`${API}/api/leaverequest/policy`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supervisorAccountId: user.id,
                    yearlyLimit: yearly,
                    monthlyLimit: monthly,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setPolicyError(data.message || 'Could not update the leave policy.');
                return;
            }

            setPolicy({ yearlyLimit: data.yearlyLimit, monthlyLimit: data.monthlyLimit });
            setPolicySuccess('Leave policy updated.');
        } catch (e) {
            console.error(e);
            setPolicyError('Could not update the leave policy.');
        } finally {
            setPolicySaving(false);
        }
    }

    async function openDecision(leaveId) {
        if (activeId === leaveId) {
            setActiveId(null);
            closeDecision();
            return;
        }

        const leave = leaves.find(item => item.leaveId === leaveId);

        setActiveId(leaveId);
        setRemarks('');
        setSubstituteOfficeBoyAccountId('');
        setApprovedStartDate(toInputDate(leave?.startDate));
        setApprovedEndDate(toInputDate(leave?.endDate));
        setFreeOfficeBoys([]);
        setFreeOfficeBoysLoaded(false);
        setFreeOfficeBoysError('');
        setFreeOfficeBoysLoading(true);

        try {
            const query = leave?.officeBoyId ? `?officeBoyId=${leave.officeBoyId}` : '';
            const res = await fetch(`${API}/api/leaverequest/free-officeboys${query}`);
            const text = await res.text();
            const json = text ? JSON.parse(text) : [];

            if (!res.ok) {
                throw new Error(json.message || 'Could not load substitute candidates.');
            }
            if (!Array.isArray(json)) {
                throw new Error('Could not load substitute candidates.');
            }

            setFreeOfficeBoys(json.map(officeBoy => ({
                id: officeBoy.id ?? officeBoy.Id,
                name: officeBoy.name ?? officeBoy.Name ?? 'Unknown',
                isAssigned: officeBoy.isAssigned ?? officeBoy.IsAssigned ?? false,
                assignedFloors: officeBoy.assignedFloors ?? officeBoy.AssignedFloors ?? [],
                activeTaskCount: officeBoy.activeTaskCount ?? officeBoy.ActiveTaskCount ?? 0,
            })));
            setFreeOfficeBoysLoaded(true);
        } catch (e) {
            const message = e.message || 'Could not load substitute candidates.';
            setFreeOfficeBoysError(message);
        } finally {
            setFreeOfficeBoysLoading(false);
        }
    }

    function closeDecision() {
        setRemarks('');
        setSubstituteOfficeBoyAccountId('');
        setApprovedStartDate('');
        setApprovedEndDate('');
        setFreeOfficeBoys([]);
        setFreeOfficeBoysLoaded(false);
        setFreeOfficeBoysError('');
    }

    async function handleDecide(leaveId, approve) {
        const leave = leaves.find(item => item.leaveId === leaveId);

        if (approve && freeOfficeBoysLoading) {
            alert('Please wait while substitute candidates are loaded.');
            return;
        }
        if (approve && freeOfficeBoysError) {
            alert(freeOfficeBoysError);
            return;
        }
        if (approve && (!approvedStartDate || !approvedEndDate)) {
            alert('Select the approved start and end dates');
            return;
        }
        if (approve && approvedEndDate < approvedStartDate) {
            alert('Approved end date cannot be before the start date');
            return;
        }
        if (approve && leave?.startDate && approvedStartDate < toInputDate(leave.startDate)) {
            alert('Approved start date cannot be before the requested start date');
            return;
        }
        if (approve && leave?.endDate && approvedEndDate > toInputDate(leave.endDate)) {
            alert('Approved end date cannot be after the requested end date');
            return;
        }
        if (approve && leave?.hasActiveAssignment && !substituteOfficeBoyAccountId) {
            alert('Select a substitute office boy');
            return;
        }

        setDecidingId(leaveId);
        try {
            const payload = {
                supervisorAccountId: user.id,
                approve,
                remarks: remarks.trim() || null,
            };

            if (approve) {
                payload.startDate = approvedStartDate;
                payload.endDate = approvedEndDate;
                if (substituteOfficeBoyAccountId) {
                    payload.substituteOfficeBoyAccountId = Number(substituteOfficeBoyAccountId);
                }
            }

            const res = await fetch(`${API}/api/leaverequest/${leaveId}/decide`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errText = await res.text();
                let msg = 'Failed to update leave request.';
                try { msg = JSON.parse(errText).message || msg; } catch { }
                alert(msg);
                return;
            }

            setActiveId(null);
            closeDecision();
            fetchPending();
        } catch (e) {
            console.error(e);
            alert('Something went wrong. Please try again.');
        } finally {
            setDecidingId(null);
        }
    }

    function candidateLabel(officeBoy) {
        const floors = Array.isArray(officeBoy.assignedFloors) && officeBoy.assignedFloors.length > 0
            ? `Floor ${officeBoy.assignedFloors.join(', ')}`
            : 'Unassigned';
        return `${officeBoy.name} — ${floors} · ${officeBoy.activeTaskCount} active task${officeBoy.activeTaskCount === 1 ? '' : 's'}`;
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

            {/* Leave policy */}
            <div className="bg-white rounded-2xl px-6 py-5 shadow-sm border border-gray-100 mb-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-base font-bold text-gray-800">Leave Allowance Policy</h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Applies to all office boys. Changes take effect immediately.
                        </p>
                    </div>
                    {policy && (
                        <span className="text-xs text-gray-400 shrink-0">
                            Current: {policy.yearlyLimit}/year · {policy.monthlyLimit}/month
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Yearly limit (days)</label>
                        <input
                            type="number"
                            min="1"
                            value={policyYearly}
                            onChange={e => setPolicyYearly(e.target.value)}
                            className="w-36 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[#0C7347]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Monthly limit (days)</label>
                        <input
                            type="number"
                            min="1"
                            value={policyMonthly}
                            onChange={e => setPolicyMonthly(e.target.value)}
                            className="w-36 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[#0C7347]"
                        />
                    </div>
                    <button
                        onClick={savePolicy}
                        disabled={policySaving}
                        className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                        style={{ backgroundColor: '#0C7347' }}>
                        {policySaving ? 'Saving...' : 'Save policy'}
                    </button>
                </div>

                {policyError && <p className="text-xs text-red-500 mt-3">{policyError}</p>}
                {policySuccess && <p className="text-xs text-[#0C7347] mt-3">{policySuccess}</p>}
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
                                <div className="flex items-center gap-3">
                                    <UserAvatar
                                        name={leave.officeBoyName}
                                        imageUrl={leave.officeBoyImageUrl}
                                        size={40}
                                    />
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">{leave.officeBoyName}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {leave.hasActiveAssignment
                                                ? `Assigned to Floor ${(leave.assignedFloors || []).join(', ') || '—'}`
                                                : 'No active floor assignment'}
                                        </p>
                                    </div>
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

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">
                                                Approved start date
                                            </label>
                                            <input
                                                type="date"
                                                value={approvedStartDate}
                                                min={toInputDate(leave.startDate)}
                                                max={toInputDate(leave.endDate)}
                                                onChange={e => setApprovedStartDate(e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[#0C7347]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">
                                                Approved end date
                                            </label>
                                            <input
                                                type="date"
                                                value={approvedEndDate}
                                                min={approvedStartDate || toInputDate(leave.startDate)}
                                                max={toInputDate(leave.endDate)}
                                                onChange={e => setApprovedEndDate(e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[#0C7347]"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-gray-400 -mt-1">
                                        Requested {formatDate(leave.startDate)} – {formatDate(leave.endDate)}. Approved dates must stay within this range.
                                    </p>

                                    {/* Substitute */}
                                    {leave.hasActiveAssignment && (
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">
                                                Substitute office boy (required)
                                            </label>

                                            {freeOfficeBoysLoading ? (
                                                <p className="text-xs text-gray-400">Loading candidates...</p>
                                            ) : freeOfficeBoysError ? (
                                                <p className="text-xs text-red-500">{freeOfficeBoysError}</p>
                                            ) : freeOfficeBoysLoaded && freeOfficeBoys.length === 0 ? (
                                                <p className="text-xs text-amber-600">
                                                    No available substitute candidates. Assign a floor to another office boy first.
                                                </p>
                                            ) : (
                                                <select
                                                    value={substituteOfficeBoyAccountId}
                                                    onChange={e => setSubstituteOfficeBoyAccountId(e.target.value)}
                                                    className="w-full border text-gray-500 rounded-xl px-4 py-3"
                                                >
                                                    <option value="">Select substitute office boy</option>
                                                    {freeOfficeBoys.map(officeBoy => (
                                                        <option key={officeBoy.id} value={officeBoy.id}>
                                                            {candidateLabel(officeBoy)}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}

                                            <p className="text-[11px] text-gray-400 mt-1.5">
                                                Candidates are ranked: unassigned first, then lowest active task load.
                                            </p>
                                            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2">
                                                Any Pending or In Progress tasks will be transferred to the substitute and returned automatically when the leave ends.
                                            </p>
                                        </div>
                                    )}

                                    {!leave.hasActiveAssignment && (
                                        <p className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                                            This office boy has no active floor assignment, so no substitute or task transfer is needed.
                                        </p>
                                    )}

                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={() => handleDecide(leave.leaveId, true)}
                                            disabled={decidingId === leave.leaveId || (leave.hasActiveAssignment && freeOfficeBoysLoading)}
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
                                            onClick={() => { setActiveId(null); closeDecision(); }}
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
