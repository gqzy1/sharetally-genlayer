/** Public transaction evidence excludes validator configuration and duplicate byte arrays. */
export function publicReceipt(r: any) {
    const selected: any = Object.fromEntries(['hash', 'from_address', 'to_address', 'status', 'statusName', 'result', 'resultName', 'leader_only', 'execution_mode', 'value', 'txExecutionResultName', 'txDataDecoded'].filter(k => r[k] !== undefined).map(k => [k, r[k]]));
    selected.data = { ...r.data };
    delete selected.data.contract_code;
    const leaders = r.consensus_data?.leader_receipt;
    if (r.consensus_data)
        selected.consensus_data = { votes: r.consensus_data.votes, leader_receipt: (Array.isArray(leaders) ? leaders : leaders ? [leaders] : []).map((x: any) => Object.fromEntries(['mode', 'vote', 'execution_result', 'genvm_result', 'result', 'eq_outputs'].filter(k => x[k] !== undefined).map(k => [k, x[k]]))) };
    return JSON.parse(JSON.stringify(selected, (_key, value) => { if (value && typeof value === 'object' && typeof value.base64 === 'string') {
        const { raw: _raw, ...encoded } = value;
        return encoded;
    } return value; }));
}
