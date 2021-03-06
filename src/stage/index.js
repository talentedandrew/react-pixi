import React from 'react'
import * as PIXI from 'pixi.js'
import PropTypes from 'prop-types'
import invariant from 'fbjs/lib/invariant'
import { PROPS_DISPLAY_OBJECT } from '../utils/props'
import { runningInBrowser } from '../helpers'
import { PixiFiber } from '../reconciler'
import { injectDevtools } from '../render'

const noop = () => {}

/**
 * -------------------------------------------
 * Stage React Component (use this in react-dom)
 *
 * @usage
 *
 *    const App = () => (
 *      <Stage width={500}
 *             height={500}
 *             options={ backgroundColor: 0xff0000 }
 *             onMount={( renderer, canvas ) => {
 *               console.log('PIXI renderer: ', renderer)
 *               console.log('Canvas element: ', canvas)
 *             }}>
 *    )
 *
 * -------------------------------------------
 */

const propTypes = {
  // dimensions
  width: PropTypes.number,
  height: PropTypes.number,

  // will return renderer
  onMount: PropTypes.func,

  // run ticker at start?
  raf: PropTypes.bool,

  // render component on component lifecycle changes?
  renderOnComponentChange: PropTypes.bool,

  children: PropTypes.node,

  // PIXI options, see http://pixijs.download/dev/docs/PIXI.Application.html
  options: PropTypes.shape({
    antialias: PropTypes.bool,
    autoStart: PropTypes.bool,
    width: PropTypes.number,
    height: PropTypes.number,
    transparent: PropTypes.bool,
    preserveDrawingBuffer: PropTypes.bool,
    resolution: PropTypes.number,
    forceCanvas: PropTypes.bool,
    backgroundColor: PropTypes.number,
    clearBeforeRender: PropTypes.bool,
    roundPixels: PropTypes.bool,
    forceFXAA: PropTypes.bool,
    legacy: PropTypes.bool,
    powerPreference: PropTypes.string,
    sharedTicker: PropTypes.bool,
    sharedLoader: PropTypes.bool,

    // view is optional, use if provided
    view: (props, propName, componentName) => {
      const el = props[propName]
      if (el === undefined) {
        return
      }
      invariant(
        el instanceof HTMLCanvasElement,
        `Invalid prop \`view\` of type ${typeof el}, supplied to ${componentName}, expected \`<canvas> Element\``
      )
    },
  }),
}

const defaultProps = {
  width: 800,
  height: 600,
  onMount: noop,
  raf: true,
  renderOnComponentChange: true,
}

export function getCanvasProps(props) {
  const reserved = [...Object.keys(propTypes), ...Object.keys(PROPS_DISPLAY_OBJECT)]

  return Object.keys(props)
    .filter(p => !reserved.includes(p))
    .reduce((all, prop) => ({ ...all, [prop]: props[prop] }), {})
}

class Stage extends React.Component {
  _canvas = null
  app = null

  getChildContext() {
    return { app: this.app }
  }

  componentWillMount() {
    invariant(runningInBrowser(), `Cannot mount Stage, window object is not defined`)
  }

  componentDidMount() {
    const { onMount, children, width, height, options, raf } = this.props

    this.app = new PIXI.Application(width, height, {
      ...options,
      view: this._canvas,
    })

    if (!raf) {
      this.app.ticker.stop()
      this.app.ticker.autoStart = false
    }

    this.mountNode = PixiFiber.createContainer(this.app.stage)
    PixiFiber.updateContainer(children, this.mountNode, this)

    injectDevtools()

    onMount(this.app)
    this.renderStage()
  }

  componentDidUpdate(prevProps, prevState, prevContext) {
    const { children, width, height } = this.props

    // handle resize
    if (prevProps.height !== height || prevProps.width !== width) {
      this.app.renderer.resize(width, height)
    }

    // handle resolution ?

    // flush fiber
    PixiFiber.updateContainer(children, this.mountNode, this)
    this.renderStage()
  }

  renderStage() {
    const { renderOnComponentChange, raf } = this.props

    if (!raf && renderOnComponentChange) {
      this.app.renderer.render(this.app.stage)
    }
  }

  componentWillUnmount() {
    PixiFiber.updateContainer(null, this.mountNode, this)
    this.renderStage()
  }

  render() {
    const { options } = this.props

    if (options && options.view) {
      invariant(options.view instanceof HTMLCanvasElement, 'options.view needs to be a `HTMLCanvasElement`')
      return null
    }

    return <canvas {...getCanvasProps(this.props)} ref={c => (this._canvas = c)} />
  }
}

Stage.propTypes = propTypes
Stage.defaultProps = defaultProps
Stage.childContextTypes = { app: PropTypes.object }

export default Stage
