/* ==========================================================================
   MODULE: BACKGROUND CALCULATION WEB WORKER
   Multi-Threaded Data Processing & Aggregation Pipeline
   ========================================================================== */

self.onmessage = function(e) {
  const { action, id, data } = e.data || {};

  if (action === 'PROCESS_DATA') {
    const { allUsers = {}, allRecords = [], fundSettings = {}, fundLogs = [] } = data;

    // 1. Phân luồng tính toán số nhà & xếp hạng thành viên
    const totals = {};
    let totalBinh = 0;

    for (let i = 0; i < allRecords.length; i++) {
      const r = allRecords[i];
      const uid = r.userId || 'unknown';
      if (!totals[uid]) {
        totals[uid] = {
          id: uid,
          name: r.userName || (allUsers[uid] && allUsers[uid].name) || 'Chưa rõ',
          binh: 0
        };
      }
      const val = Number(r.binh) || 0;
      totals[uid].binh += val;
      totalBinh += val;
    }

    const statsData = Object.values(totals).sort((a, b) => b.binh - a.binh);
    const roundedTotal = Math.round(totalBinh * 100) / 100;
    const activeMembersInPeriod = statsData.length;
    const totalMembersCount = Object.keys(allUsers).length;
    const avgBinh = activeMembersInPeriod > 0 ? (roundedTotal / activeMembersInPeriod).toFixed(1) : 0;
    const topMember = statsData.length > 0 ? statsData[0] : null;

    // 2. Phân luồng tính toán quỹ & lịch sử chuộc tù
    const initial = Number(fundSettings.initialFund) || 5000000;
    const bailFee = Number(fundSettings.bailFee) || 60000;

    const chronological = [...fundLogs].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    let running = initial;
    let totalBailSpent = 0;
    let bailCount = 0;
    const memberBailMap = {};

    const enrichedLogs = new Array(chronological.length);
    for (let i = 0; i < chronological.length; i++) {
      const log = chronological[i];
      const amt = Number(log.amount) || 0;
      running += amt;
      if (log.type === 'bail') {
        totalBailSpent += Math.abs(amt);
        bailCount++;
        const mName = log.memberName || 'Chưa rõ';
        memberBailMap[mName] = (memberBailMap[mName] || 0) + 1;
      }
      enrichedLogs[i] = {
        ...log,
        balanceAfter: running
      };
    }

    // Trả kết quả đã tính toán xong về Luồng giao diện chính (UI Main Thread)
    self.postMessage({
      action: 'PROCESS_DATA_COMPLETE',
      id,
      result: {
        stats: {
          statsData,
          roundedTotal,
          activeMembersInPeriod,
          totalMembersCount,
          avgBinh,
          topMember
        },
        fund: {
          initial,
          bailFee,
          currentBalance: running,
          totalBailSpent,
          bailCount,
          enrichedLogs: enrichedLogs.reverse(),
          memberBailMap
        }
      }
    });
  }
};
