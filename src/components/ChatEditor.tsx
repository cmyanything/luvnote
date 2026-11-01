import { useState } from 'react';
import type { ChatRow } from '../types';
import { CHAT_TEMPLATES } from '../themes';
import { useModal } from '../hooks/useModal';

const STICKERS = { heart: '💗', cake: '🎂', gift: '🎁', hug: '🫶' };
const TYPES = {
  f: {
    icon: '💬',
    label: 'คุณพิมพ์',
    hint: 'ข้อความที่คุณพิมพ์ส่งไป จะเด้งขึ้นพร้อม "กำลังพิมพ์…"',
  },
  t: {
    icon: '👆',
    label: 'ผู้รับเลือกตอบ',
    hint: 'ผู้รับจะเห็นปุ่มคำตอบให้แตะเลือกเอง ใส่ได้ 3 แบบ (ข้อความถัดไปควรต่อได้กับทุกคำตอบ)',
  },
  oops: {
    icon: '🙊',
    label: 'แกล้งแล้วลบ',
    hint: 'ข้อความนี้จะโผล่แป๊บนึง แล้วถูกยกเลิกให้กลายเป็น "ยกเลิกข้อความแล้ว" 😝',
  },
  stk: {
    icon: '🎂',
    label: 'สติกเกอร์',
    hint: 'เลือกสติกเกอร์ตัวใหญ่ที่จะเด้งในแชท',
  },
  pic: {
    icon: '📸',
    label: 'ส่งรูป',
    hint: 'ตรงนี้จะส่งรูปทั้งหมดที่คุณเพิ่มในข้อ 3 เป็นอัลบั้มในแชท',
  },
};

function rowText(row: ChatRow, photos: number) {
  if (row.w === 'stk') return `${STICKERS[row.s]} สติกเกอร์`;
  if (row.w === 'pic') return `อัลบั้ม ${photos} รูป`;
  if (row.w === 't')
    return row.o
      .map((s) => s.trim())
      .filter(Boolean)
      .join(' / ');
  return row.x.trim();
}

export function ChatEditor({
  rows,
  photoCount,
  onChange,
  toast,
}: {
  rows: ChatRow[];
  photoCount: number;
  onChange: (rows: ChatRow[]) => void;
  toast: (message: string) => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  return (
    <>
      <div className="tpls" id="ctpls">
        {['💗 แฟน', '😆 เพื่อนกวนๆ', '🥹 ครอบครัว'].map((label, index) => (
          <button
            type="button"
            key={label}
            onClick={() => onChange(structuredClone(CHAT_TEMPLATES[index]))}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="cl" id="cl">
        {rows.map((row, index) => {
          const text = rowText(row, photoCount),
            type = TYPES[row.w];
          return (
            <button
              type="button"
              className={`ci ${row.w}`}
              key={index}
              onClick={() => setEditing(index)}
              aria-label={`แก้ไขข้อความที่ ${index + 1}`}
            >
              <span className="no">{index + 1}</span>
              <span className="ic">{type.icon}</span>
              <span className="tx">
                <small>{type.label}</small>
                <span className={text ? '' : 'empty'}>
                  {text || 'แตะเพื่อพิมพ์ข้อความ…'}
                </span>
              </span>
              <span className="go">›</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="addmsg"
        id="addmsg"
        disabled={rows.length >= 16}
        onClick={() => {
          onChange([...rows, { w: 'f', x: '' }]);
          setEditing(rows.length);
        }}
      >
        ＋ เพิ่มข้อความ
      </button>
      <p className="help">
        แตะที่ข้อความเพื่อแก้ไข ย้ายลำดับ หรือลบ · หลังแชทจบ
        จะมีวิดีโอคอลเป่าเทียน จดหมาย และข้อความลับต่อให้อัตโนมัติ
      </p>
      {editing !== null && rows[editing] && (
        <ChatDialog
          index={editing}
          rows={rows}
          photoCount={photoCount}
          onChange={onChange}
          onIndex={setEditing}
          onClose={() => setEditing(null)}
          toast={toast}
        />
      )}
    </>
  );
}

function ChatDialog({
  index,
  rows,
  photoCount,
  onChange,
  onIndex,
  onClose,
  toast,
}: {
  index: number;
  rows: ChatRow[];
  photoCount: number;
  onChange: (rows: ChatRow[]) => void;
  onIndex: (index: number) => void;
  onClose: () => void;
  toast: (message: string) => void;
}) {
  const dialog = useModal(onClose),
    row = rows[index];
  function replace(next: ChatRow) {
    onChange(rows.map((r, i) => (i === index ? next : r)));
  }
  function changeType(type: ChatRow['w']) {
    const text = row.w === 't' ? row.o[0] || '' : 'x' in row ? row.x : '';
    if (type === 'stk')
      replace({ w: type, s: row.w === 'stk' ? row.s : 'heart' });
    else if (type === 'pic') replace({ w: type });
    else if (type === 't') replace({ w: type, o: [text, '', ''] });
    else replace({ w: type, x: text });
  }
  function move(delta: number) {
    const next = [...rows],
      target = index + delta;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    onIndex(target);
  }
  return (
    <>
      <div className="cscrim show" id="cscrim" onClick={onClose} />
      <div
        className="csheet show"
        id="csheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="csTitle"
        ref={dialog}
      >
        <div className="grab" />
        <div className="cshd">
          <b id="csTitle">ข้อความที่ {index + 1}</b>
          <button
            type="button"
            className="csdone"
            id="csDone"
            onClick={onClose}
          >
            เสร็จ
          </button>
        </div>
        <p className="cslab">ใครพูด / แบบไหน</p>
        <div className="cstypes" id="csTypes">
          {(Object.keys(TYPES) as ChatRow['w'][]).map((type) => (
            <button
              key={type}
              type="button"
              data-w={type}
              className={row.w === type ? 'on' : ''}
              aria-pressed={row.w === type}
              disabled={
                type === 'pic' &&
                row.w !== 'pic' &&
                rows.some((r) => r.w === 'pic')
              }
              onClick={() => changeType(type)}
            >
              <span>{TYPES[type].icon}</span>
              {TYPES[type].label}
            </button>
          ))}
        </div>
        <p className="cshint" id="csHint">
          {TYPES[row.w].hint}
        </p>
        <div id="csBody">
          {(row.w === 'f' || row.w === 'oops') && (
            <textarea
              id="csX"
              rows={3}
              maxLength={100}
              aria-label="ข้อความแชท"
              placeholder={
                row.w === 'oops' ? 'เช่น แก่แล้วนะเรา 👵' : 'พิมพ์ข้อความ…'
              }
              value={row.x}
              onChange={(e) => replace({ ...row, x: e.target.value })}
            />
          )}
          {row.w === 't' && (
            <div className="opt3">
              {Array.from({ length: 3 }, (_, option) => (
                <input
                  key={option}
                  type="text"
                  maxLength={60}
                  enterKeyHint="next"
                  aria-label={`คำตอบที่ ${option + 1}`}
                  placeholder={`คำตอบที่ ${option + 1}${option ? ' (ไม่ใส่ก็ได้)' : ''}`}
                  value={row.o[option] || ''}
                  onChange={(e) =>
                    replace({
                      w: 't',
                      o: Array.from({ length: 3 }, (_, i) =>
                        i === option ? e.target.value : row.o[i] || '',
                      ),
                    })
                  }
                />
              ))}
            </div>
          )}
          {row.w === 'stk' && (
            <div className="stks2">
              {(Object.keys(STICKERS) as (keyof typeof STICKERS)[]).map(
                (sticker) => (
                  <button
                    type="button"
                    key={sticker}
                    className={row.s === sticker ? 'on' : ''}
                    aria-label={`สติกเกอร์ ${sticker}`}
                    aria-pressed={row.s === sticker}
                    onClick={() => replace({ w: 'stk', s: sticker })}
                  >
                    {STICKERS[sticker]}
                  </button>
                ),
              )}
            </div>
          )}
          {row.w === 'pic' && (
            <div className="picinfo">
              📸 ตอนนี้เพิ่มรูปไว้ <b className="en">{photoCount}</b> รูป
              {!photoCount && ' · ไปเพิ่มรูปได้ที่ข้อ 3 (ถ้าไม่มีรูป จะข้ามไป)'}
            </div>
          )}
        </div>
        <div className="csacts">
          <button
            type="button"
            id="csUp"
            disabled={!index}
            onClick={() => move(-1)}
          >
            ↑ ย้ายขึ้น
          </button>
          <button
            type="button"
            id="csDown"
            disabled={index === rows.length - 1}
            onClick={() => move(1)}
          >
            ↓ ย้ายลง
          </button>
          <button
            type="button"
            className="del"
            id="csDel"
            onClick={() => {
              onChange(rows.filter((_, i) => i !== index));
              onClose();
              toast('ลบข้อความแล้ว');
            }}
          >
            ลบข้อความนี้
          </button>
        </div>
      </div>
    </>
  );
}
