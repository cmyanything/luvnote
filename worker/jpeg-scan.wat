;; Bounded entropy-marker scan only. JPEG structure/metadata checks remain in JS;
;; full pixel canonicalization remains Cloudflare Images, never this module.
;; Build: npm exec --yes --package=wabt@1.0.39 -- wat2wasm worker/jpeg-scan.wat -o worker/jpeg-scan.wasm
(module
  (memory (export "memory") 46 46)
  (func (export "next") (param $offset i32) (param $end i32) (result i32)
    (local $prefix i32) (local $byte i32)
    (block $done
      (loop $scan
        (br_if $done (i32.ge_u (local.get $offset) (local.get $end)))
        (local.set $prefix (local.get $offset))
        (local.set $byte (i32.load8_u (local.get $offset)))
        (local.set $offset (i32.add (local.get $offset) (i32.const 1)))
        (br_if $scan (i32.ne (local.get $byte) (i32.const 255)))
        (block $filled
          (loop $fill
            (br_if $filled (i32.ge_u (local.get $offset) (local.get $end)))
            (br_if $filled (i32.ne (i32.load8_u (local.get $offset)) (i32.const 255)))
            (local.set $offset (i32.add (local.get $offset) (i32.const 1)))
            (br $fill)))
        (if (i32.ge_u (local.get $offset) (local.get $end)) (then (return (local.get $prefix))))
        (local.set $byte (i32.load8_u (local.get $offset)))
        (local.set $offset (i32.add (local.get $offset) (i32.const 1)))
        (br_if $scan (i32.eqz (local.get $byte)))
        (br_if $scan (i32.and (i32.ge_u (local.get $byte) (i32.const 208)) (i32.le_u (local.get $byte) (i32.const 215))))
        (return (local.get $prefix))))
    (local.get $end)))
