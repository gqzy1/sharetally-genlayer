"""Export explicitly authored offline examples. No RPC, wallet or model is used."""
import importlib.util
import json
import pathlib

root = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('offline_host', root/'tests/test_contract.py')
host = importlib.util.module_from_spec(spec)
spec.loader.exec_module(host)
c = host.c
fixtures = []
for name, costs, n in [
    ('additive-ready', [0]+[120+30*m.bit_count() for m in range(1,8)], 3),
    ('coalition-blocked', [0,1,1,1,1,1,1,3], 3),
    ('nonmonotone-blocked', [0,3,3,2], 2),
    ('rounding-blocked', [0]+[(m.bit_count()+1)//2 for m in range(1,16)], 4),
]:
    quotation = 'Standalone total prices, in minor units, for every listed exact member combination: ' + '; '.join(
        ','.join(host.data(n)['members'][i]['name'] for i in range(n) if m & (1<<i))+' = '+str(costs[m]) for m in range(1,1<<n)) + '. No other fees apply.'
    data = host.data(n);data['quotation'] = quotation
    # Excerpts are bounded single-coalition entries, not an oversized full quotation.
    accepted = {'rows':[]}
    for m in range(1,1<<n):
        names=','.join(data['members'][i]['name'] for i in range(n) if m & (1<<i))
        excerpt=names+' = '+str(costs[m])
        if len(excerpt)<8:excerpt=quotation[:quotation.index(excerpt)+len(excerpt)]
        accepted['rows'].append({'mask':m,'status':'KNOWN','cost':costs[m],'quote':excerpt})
    proof = c.derive(accepted, n)
    book={'id':host.A+':'+name,'owner':host.A,'input':data,'input_hash':c.digest({'version':c.VERSION,'input':data}),
          'revision':1,'state':proof['status'],'approvals':[],'accepted':accepted,'proof':proof}
    book['allocation_hash']=c.digest({'version':c.VERSION,'book_id':book['id'],'input_hash':book['input_hash'],'accepted':accepted,'proof':proof})
    fixtures.append({'provenance':'OFFLINE_AUTHORED','label':name,'book':book})
(root/'examples/offline-fixtures.json').write_text(json.dumps(fixtures,indent=2)+'\n')
print('Exported four authored fixtures; no chain interaction.')
