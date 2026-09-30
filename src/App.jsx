import { useEffect, useRef, useState } from 'react'
import circuitBefore from '../circuit-unconnected-transparent.png'
import circuitAfter from '../circuit-connected-transparent.png'
import potentiometer from '../potentiometer-transparent.png'
import led from '../led-transparent.png'
import resistor from '../resistor-transparent.png'

const LED_THRESHOLD = 512
const initialConnections = { vcc: false, gnd: false, a0: false }

const initialCode = `const int sensorPin = A0;
const int ledPin = 9;
const int threshold = 512;

void setup() {
  Serial.begin(9600);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  int value = analogRead(sensorPin);
  digitalWrite(ledPin, value >= threshold ? HIGH : LOW);
  Serial.println(value);
  delay(1000);
}`

const connectionOptions = [
  { key: 'vcc', label: '🔴 5V → крайній контакт' },
  { key: 'gnd', label: '⚫ GND → крайній контакт' },
  { key: 'a0', label: '🟢 A0 → середній контакт' },
]

export default function App() {
  const [connections, setConnections] = useState(initialConnections)
  const [diagram, setDiagram] = useState('before')
  const [code, setCode] = useState(initialCode)
  const [value, setValue] = useState(0)
  const [running, setRunning] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [readings, setReadings] = useState([])
  const [status, setStatus] = useState('Симуляцію не запущено')
  const [readingState, setReadingState] = useState('готово')
  const currentValue = useRef(0)
  const lineNumber = useRef(0)
  const serial = useRef(null)

  const connectedCount = Object.values(connections).filter(Boolean).length
  const codeReady = /analogRead/.test(code) && /digitalWrite/.test(code)
  const ledOn = running && value >= LED_THRESHOLD
  const percent = Math.round((value / 1023) * 100)

  function addReading(nextValue) {
    const entry = {
      line: ++lineNumber.current,
      value: nextValue,
      ledOn: nextValue >= LED_THRESHOLD,
    }
    setReadings((previous) => [...previous.slice(-99), entry])
  }

  useEffect(() => {
    if (!running) return undefined
    addReading(currentValue.current)
    const timer = setInterval(() => addReading(currentValue.current), 1000)
    return () => clearInterval(timer)
  }, [running])

  useEffect(() => {
    if (serial.current) serial.current.scrollTop = serial.current.scrollHeight
  }, [readings])

  function stop() {
    setRunning(false)
    setStatus('Симуляцію зупинено')
    setReadingState('зупинено')
  }

  function toggleConnection(key) {
    const next = { ...connections, [key]: !connections[key] }
    const count = Object.values(next).filter(Boolean).length
    setConnections(next)
    setDiagram(count === 3 ? 'after' : 'before')
    if (running && count !== 3) stop()
  }

  function toggleSimulation() {
    if (running) {
      stop()
      return
    }
    if (connectedCount !== 3) {
      setStatus("Спочатку з'єднай усі контакти")
      return
    }
    if (!codeReady) {
      setStatus('Перевір код: потрібні analogRead і digitalWrite')
      return
    }
    lineNumber.current = 0
    setReadings([])
    setHasStarted(true)
    setRunning(true)
    setStatus('Симуляція працює')
    setReadingState('працює')
  }

  function reset() {
    setRunning(false)
    setConnections(initialConnections)
    setDiagram('before')
    setValue(0)
    currentValue.current = 0
    lineNumber.current = 0
    setReadings([])
    setHasStarted(false)
    setStatus('Симуляцію не запущено')
    setReadingState('готово')
  }

  function movePotentiometer(event) {
    const next = Number(event.target.value)
    currentValue.current = next
    setValue(next)
    if (running) addReading(next)
  }

  const steps = [
    { title: 'Розглянь компоненти', detail: 'Arduino, LED, резистор, потенціометр', done: true, active: connectedCount < 1 },
    { title: "З'єднай контакти", detail: '5V, GND та A0', done: connectedCount === 3, active: connectedCount > 0 && connectedCount < 3 },
    { title: 'Встав код', detail: 'analogRead на A0', done: codeReady, active: connectedCount === 3 && !running && !codeReady },
    { title: 'Запусти', detail: 'Рухай ручку і спостерігай', done: running, active: connectedCount === 3 && !running && codeReady },
  ]

  return (
    <main className="wrap">
      <header>
        <div className="brand">
          <div className="brand-mark">A0</div>
          <div>
            <div className="eyebrow">Онлайн-лабораторія</div>
            <h1>Arduino Mobile Lab</h1>
            <p className="sub">Збери схему, встав код і побач, як змінюється показник потенціометра.</p>
          </div>
        </div>
        <div className="status" role="status" aria-live="polite">
          <span className={`dot${running ? ' on' : ''}`} />
          <span>{status}</span>
        </div>
      </header>

      <section className="steps" aria-label="Кроки роботи">
        {steps.map((step, index) => (
          <div key={step.title} className={`step${step.done ? ' done' : ''}${step.active ? ' active' : ''}`}>
            <span className="step-num">КРОК {index + 1}</span>
            <strong>{step.title}</strong>
            <small>{step.detail}</small>
          </div>
        ))}
      </section>

      <section className="workspace">
        <article className="card">
          <div className="card-head">
            <div><h2>Віртуальна схема</h2><p>Спочатку розглянь деталі, потім підключи три контакти.</p></div>
            <span className="tiny">{connectedCount}/3 з'єднань</span>
          </div>
          <div className="diagram-tabs" aria-label="Вигляд схеми">
            <button type="button" className="diagram-tab" aria-pressed={diagram === 'before'} onClick={() => setDiagram('before')}>Без під'єднань</button>
            <button type="button" className="diagram-tab" aria-pressed={diagram === 'after'} onClick={() => setDiagram('after')}>З під'єднанням</button>
          </div>
          <figure className={`canvas${diagram === 'after' ? ' connected-view' : ''}${ledOn ? ' lit' : ''}`}>
            <img className="circuit-image" src={diagram === 'after' ? circuitAfter : circuitBefore} alt={diagram === 'after' ? "Зразок під'єднання Arduino Uno, світлодіода, резистора і потенціометра" : "Arduino Uno, світлодіод, резистор і потенціометр без під'єднань"} />
            <span className="diagram-glow" aria-hidden="true" />
          </figure>
          <p className="diagram-caption">{diagram === 'after' ? 'Зразок повної схеми: потенціометр підключений до 5V, GND та A0.' : "Деталі розташовані окремо. Розглянь контакти перед під'єднанням."}</p>
          <div className="card-body">
            <div className="connections">
              {connectionOptions.map(({ key, label }) => (
                <button key={key} type="button" className={`conn${connections[key] ? ' connected' : ''}`} aria-pressed={connections[key]} onClick={() => toggleConnection(key)}>
                  <span>{label}</span><span>{connections[key] ? 'підключено ✓' : 'підключити'}</span>
                </button>
              ))}
            </div>
            <div className="parts" aria-label="Деталі схеми">
              <div className="part"><img src={potentiometer} alt="Потенціометр" /><span>Потенціометр</span></div>
              <div className={`part part-led${ledOn ? ' on' : ''}`}><img src={led} alt="Світлодіод" /><span>Світлодіод</span></div>
              <div className="part"><img src={resistor} alt="Резистор" /><span>Резистор</span></div>
            </div>
            <div className="tip">Після трьох підключень схема покаже дроти. Запусти симуляцію: коли A0 досягне 512, світлодіод загориться.</div>
          </div>
        </article>

        <article className="card">
          <div className="card-head"><div><h2>Код і симуляція</h2><p>Код читає A0 від 0 до 1023 і керує світлодіодом на D9.</p></div></div>
          <div className="card-body">
            <label className="tiny" htmlFor="code">Редактор коду Arduino</label>
            <textarea id="code" className="editor" spellCheck="false" value={code} onChange={(event) => setCode(event.target.value)} />
            <div className="actions">
              <button className="btn run" type="button" onClick={toggleSimulation}>{running ? '■ Зупинити симуляцію' : '▶ Запустити симуляцію'}</button>
              <button className="btn secondary" type="button" onClick={reset}>Скинути</button>
            </div>
            <div className="readout"><div><span>Поточне значення A0</span><strong>{value}</strong></div><div className="state">{readingState}</div></div>
            <div className={`led-indicator${ledOn ? ' on' : ''}`} role="status" aria-live="polite">
              <img src={led} alt="" />
              <div><span>Світлодіод · поріг A0 ≥ 512</span><strong>{ledOn ? 'світиться' : 'не світиться'}</strong></div>
            </div>
            <div className="slider-wrap">
              <div className="slider-head"><span>Поверни ручку потенціометра</span><span>{percent}%</span></div>
              <input type="range" min="0" max="1023" value={value} onChange={movePotentiometer} aria-label="Положення потенціометра" />
            </div>
            <div className="serial" ref={serial} aria-label="Serial Monitor">
              <div className="muted">{hasStarted ? 'Serial Monitor підключено · 9600 baud' : 'Serial Monitor очікує запуску...'}</div>
              {readings.map((entry) => (
                <div key={entry.line}><span className="muted">[{String(entry.line).padStart(2, '0')}] </span><span className="value">{entry.value}</span> · LED {entry.ledOn ? 'ON' : 'OFF'}</div>
              ))}
            </div>
          </div>
        </article>
      </section>
      <footer>Мінісимулятор для онлайн-уроку · працює у браузері на телефоні та комп'ютері</footer>
    </main>
  )
}
