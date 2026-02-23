import { useState } from 'react'
const formStates = (values) => {
    const [ state, stateChanger ] = useState(values) // useState returns the current values -> state, and also specifies the function which acts on the data once there is a change
    const stateChangeLogic = (e) => {
        const { name, value } = e.target
        stateChanger({
            ...state, [name]: value //copy the current state exactly; only change the "names" that changed
        })
    }
    return [ state, stateChangeLogic ]
}
export default formStates