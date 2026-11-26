import { Component } from "react";
import { Button } from "@/components/ui";
import { ERROR_TEXT } from "@/constants/errors";
import "./ErrorBoundary.css";

/* 화면 그리는 중 오류가 나도 앱 전체가 하얗게 멈추지 않게 막아 주는 안전망.
   resetKey 가 바뀌면(예: 다른 탭으로 이동) 오류 상태를 자동으로 풀어 다시 그린다. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) { return { error }; }

  componentDidCatch(error, info) { console.error("[clacale] render error", error, info?.componentStack); }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="err" role="alert">
        <h2 className="err__title">{ERROR_TEXT.title}</h2>
        <p className="err__body">{ERROR_TEXT.body}</p>
        <div className="err__actions">
          <Button variant="secondary" onClick={() => this.setState({ error: null })}>{ERROR_TEXT.retry}</Button>
          <Button onClick={() => window.location.reload()}>{ERROR_TEXT.reload}</Button>
        </div>
      </div>
    );
  }
}
